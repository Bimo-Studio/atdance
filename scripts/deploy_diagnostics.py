#!/usr/bin/env python3
"""
ATDance deployment diagnostics (HTTP + optional Cloudflare API).

HTTP uses the stdlib. Install recommended deps (CA bundle + HTML parsing), then run checks:

  pnpm diag
  # same as: pnpm diag:deps && pnpm diag:deploy

Without **certifi**, macOS / python.org builds often fail every HTTPS check with
`CERTIFICATE_VERIFY_FAILED` — that is a local Python trust store issue, not your deploy.

Defaults match the MallDAO production split:
  App:   https://dance.malldao.xyz
  Relay: https://relay.malldao.xyz

Environment overrides:
  ATDANCE_DIAG_APP_ORIGIN    — e.g. https://dance.malldao.xyz
  ATDANCE_DIAG_RELAY_ORIGIN  — e.g. https://relay.malldao.xyz
  ATDANCE_DIAG_RELAY_WSS     — e.g. wss://relay.malldao.xyz (WebSocket probe, optional)
  CLOUDFLARE_API_TOKEN       — optional; Account API token
  CLOUDFLARE_ACCOUNT_ID      — required with token for Workers list

  ATDANCE_DIAG_ADMIN_AUTHORIZATION — optional; full Authorization header value exactly as the browser sends (e.g. `DPoP eyJ...`). Probes `GET …/admin/allowlist/v1`. The token
    is never printed. Export in your shell, run `pnpm diag:deploy`, then `unset` it.

Exit code: 0 if no failures, 1 if any check marked FAIL.

  --insecure / ATDANCE_DIAG_INSECURE_SSL=1 — skip TLS certificate verification
 (only for broken local Python CA stores; do not use against untrusted networks).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import socket
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import quote, urljoin, urlparse

try:
    from bs4 import BeautifulSoup, Comment

    _HAS_BS4 = True
except ImportError:
    BeautifulSoup = None  # type: ignore[misc, assignment]
    Comment = None  # type: ignore[misc, assignment]
    _HAS_BS4 = False

try:
    import certifi

    _CERTIFI_CA = certifi.where()
    _HAS_CERTIFI = True
except ImportError:
    _CERTIFI_CA = None
    _HAS_CERTIFI = False

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_APP_ORIGIN = "https://dance.malldao.xyz"
DEFAULT_RELAY_ORIGIN = "https://relay.malldao.xyz"
DEFAULT_RELAY_WSS = "wss://relay.malldao.xyz"
WRANGLER_PATH = os.path.join(_REPO_ROOT, "relay", "wrangler.toml")
BSKY_OAUTH_METADATA = "https://bsky.social/.well-known/oauth-authorization-server"
BSKY_RESOLVE = "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle"


@dataclass
class Row:
    check: str
    status: str  # OK | WARN | FAIL | SKIP
    detail: str
    http_status: int | None = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


def _env_origin(name: str, default: str) -> str:
    v = os.environ.get(name, "").strip()
    return v if v else default


def _ssl_ctx(insecure: bool) -> ssl.SSLContext:
    if insecure:
        return ssl._create_unverified_context()
    if _HAS_CERTIFI and _CERTIFI_CA:
        return ssl.create_default_context(cafile=_CERTIFI_CA)
    return ssl.create_default_context()


def _fetch(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    data: bytes | None = None,
    timeout: float = 20.0,
    insecure_tls: bool = False,
) -> tuple[int, dict[str, str], bytes]:
    h = {"User-Agent": "atdance-deploy-diagnostics/1.0", "Accept": "*/*"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    ctx = _ssl_ctx(insecure_tls)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            hdrs = {k.lower(): v for k, v in resp.headers.items()}
            body = resp.read()
            return resp.status, hdrs, body
    except urllib.error.HTTPError as e:
        body = e.read() if e.fp else b""
        hdrs = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
        return e.code, hdrs, body
    except Exception as e:
        raise RuntimeError(f"{url}: {e}") from e


def _parse_wrangler_hints(path: str) -> dict[str, Any]:
    hints: dict[str, Any] = {"path": path, "worker_name": None, "routes": [], "kv_ids": []}
    if not os.path.isfile(path):
        hints["error"] = "file not found"
        return hints
    text = open(path, encoding="utf-8").read()
    m = re.search(r'^name\s*=\s*"([^"]+)"', text, re.M)
    if m:
        hints["worker_name"] = m.group(1)
    for m in re.finditer(r'^pattern\s*=\s*"([^"]+)"', text, re.M):
        hints["routes"].append(m.group(1))
    # KV ids: lines like id = "..." under [[kv_namespaces]]
    in_kv = False
    for line in text.splitlines():
        if line.strip().startswith("[[kv_namespaces]]"):
            in_kv = True
            continue
        if line.strip().startswith("[[") and not line.strip().startswith("[[kv_namespaces]]"):
            in_kv = False
        if in_kv:
            m = re.match(r'\s*id\s*=\s*"([^"]+)"', line)
            if m:
                hints["kv_ids"].append(m.group(1))
    # First ATPROTO DID for allowlist probe
    m = re.search(r"ATPROTO_ALLOWLIST_DIDS\s*=\s*\"([^\"]+)\"", text)
    if m:
        first = m.group(1).split(",")[0].strip()
        hints["sample_allowlist_did"] = first
    m = re.search(r'ATDANCE_ADMIN_HANDLE\s*=\s*"([^"]+)"', text)
    if m:
        hints["admin_handle"] = m.group(1)
    return hints


def _try_json(body: bytes) -> Any | None:
    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        return None


def _extract_build_git_sha(html: str) -> tuple[str | None, str]:
    """Return (short_sha_or_none, method_label)."""
    if _HAS_BS4 and BeautifulSoup is not None and Comment is not None:
        soup = BeautifulSoup(html, "html.parser")
        for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
            m = re.search(r"atdance\s*·\s*git\s*([0-9a-f]+)\s*·", str(c), re.I)
            if m:
                return m.group(1), "bs4(comment)"
        for text in soup.find_all(string=re.compile(r"atdance\s*·\s*git", re.I)):
            m = re.search(r"atdance\s*·\s*git\s*([0-9a-f]+)\s*·", str(text), re.I)
            if m:
                return m.group(1), "bs4(text)"
    m = re.search(r"atdance\s*·\s*git\s*([0-9a-f]+)\s*·", html, re.I)
    if m:
        return m.group(1), "regex"
    return None, "none"


def _html_document_hints(html: str) -> dict[str, Any]:
    """Structured hints when Beautiful Soup is available."""
    if not _HAS_BS4 or BeautifulSoup is None:
        return {"parser": "unavailable"}
    soup = BeautifulSoup(html, "html.parser")
    title_el = soup.find("title")
    root = soup.find("html")
    return {
        "parser": "bs4",
        "title": (title_el.get_text(strip=True) if title_el else None),
        "has_html_root": root is not None,
        "script_count": len(soup.find_all("script")),
    }


def _cloudflare_workers(
    token: str,
    account_id: str,
    *,
    insecure_tls: bool,
) -> tuple[list[str] | None, str]:
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts"
    try:
        status, hdrs, body = _fetch(
            url,
            headers={"Authorization": f"Bearer {token}"},
            insecure_tls=insecure_tls,
        )
    except RuntimeError as e:
        return None, str(e)
    if status != 200:
        return None, f"HTTP {status}: {body[:200]!r}"
    j = _try_json(body)
    if not isinstance(j, dict) or not j.get("success"):
        return None, f"unexpected API body: {body[:300]!r}"
    result = j.get("result")
    if not isinstance(result, list):
        return None, "result not a list"
    names = []
    for item in result:
        if isinstance(item, dict) and "id" in item:
            names.append(str(item["id"]))
        elif isinstance(item, str):
            names.append(item)
    return names, "ok"


def _ws_probe(wss_url: str, timeout: float = 8.0, *, insecure_tls: bool = False) -> tuple[str, str]:
    try:
        parsed = urlparse(wss_url)
        host = parsed.hostname
        port = parsed.port or 443
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"

        sock = socket.create_connection((host, port), timeout=timeout)
        ctx = _ssl_ctx(insecure_tls)
        sock = ctx.wrap_socket(sock, server_hostname=host)

        key = "dGhlIHNhbXBsZSBub25jZQ=="  # fixed16-byte base64 for probe only
        req = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n"
            f"\r\n"
        )
        sock.sendall(req.encode("ascii"))
        buf = sock.recv(4096)
        sock.close()
        head = buf.decode("latin-1", errors="replace").split("\r\n\r\n", 1)[0]
        first = head.split("\r\n", 1)[0] if head else ""
        if "101" in first:
            return "OK", "HTTP 101 Switching Protocols (WebSocket upgrade accepted)"
        return "WARN", f"no101 response; first line: {first[:120]!r}"
    except Exception as e:
        return "FAIL", f"WebSocket probe error: {e}"


def run_checks(
    app_origin: str,
    relay_origin: str,
    relay_wss: str | None,
    wrangler_path: str,
    cf_token: str | None,
    cf_account: str | None,
    *,
    insecure_tls: bool,
) -> list[Row]:
    rows: list[Row] = []

    def http(*a: Any, **kw: Any) -> tuple[int, dict[str, str], bytes]:
        kw["insecure_tls"] = insecure_tls
        return _fetch(*a, **kw)

    hints = _parse_wrangler_hints(wrangler_path)

    # --- Repo / wrangler ---
    rows.append(
        Row(
            "wrangler.toml readable",
            "OK" if hints.get("worker_name") else "WARN",
            json.dumps({k: hints.get(k) for k in ("worker_name", "routes", "kv_ids", "admin_handle")}),
        )
    )
    rows.append(
        Row(
            "diag beautifulsoup4",
            "OK" if _HAS_BS4 else "SKIP",
            "pip install -r scripts/requirements-diagnostics.txt"
            if not _HAS_BS4
            else "HTML parsing enabled",
        ),
    )
    rows.append(
        Row(
            "diag TLS CA bundle (certifi)",
            "OK" if _HAS_CERTIFI else "WARN",
            f"using {_CERTIFI_CA!r}" if _HAS_CERTIFI else "pip install certifi (or pnpm diag:deps && pnpm diag:deploy) — avoids CERTIFICATE_VERIFY_FAILED on many Mac Python builds",
        ),
    )

    # --- Relay root ---
    try:
        st, hdrs, body = http(relay_origin.rstrip("/") + "/")
        ok = st == 200 and b"ATDance relay" in body
        rows.append(
            Row(
                "relay GET /",
                "OK" if ok else "FAIL",
                f"content-type={hdrs.get('content-type', '')!r}; body_prefix={body[:60]!r}",
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("relay GET /", "FAIL", str(e), None))

    # --- Admin no auth ---
    try:
        st, hdrs, body = http(relay_origin.rstrip("/") + "/admin/allowlist/v1")
        ok = st == 401
        j = _try_json(body)
        detail = f"body keys={list(j.keys()) if isinstance(j, dict) else type(j).__name__}"
        rows.append(Row("relay admin GET (no auth)", "OK" if ok else "FAIL", detail, st))
    except RuntimeError as e:
        rows.append(Row("relay admin GET (no auth)", "FAIL", str(e), None))

    # --- Admin bogus bearer (expect 403 + JSON) ---
    try:
        st, hdrs, body = http(
            relay_origin.rstrip("/") + "/admin/allowlist/v1",
            headers={"Authorization": "Bearer not-a-real-jwt"},
        )
        j = _try_json(body)
        has_shape = isinstance(j, dict) and j.get("error") == "admin_auth_failed"
        ok = st == 403 and has_shape
        detail = (
            f"reason={j.get('reason')!r}" if isinstance(j, dict) else repr(body[:120])
        )
        rows.append(
            Row(
                "relay admin GET (bogus JWT)",
                "OK" if ok else "WARN" if st == 403 else "FAIL",
                detail + ("; upgrade relay if missing admin_auth_failed JSON" if st == 403 and not has_shape else ""),
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("relay admin GET (bogus JWT)", "FAIL", str(e), None))

    # --- Admin with real token from env (optional; never log the secret) ---
    auth_probe = os.environ.get("ATDANCE_DIAG_ADMIN_AUTHORIZATION", "").strip()
    if auth_probe:
        try:
            st, _hdrs, body = http(
                relay_origin.rstrip("/") + "/admin/allowlist/v1",
                headers={"Authorization": auth_probe},
            )
            j = _try_json(body) if body else None
            if st == 200 and isinstance(j, dict) and "entries" in j:
                n = len(j.get("entries", []))
                rows.append(
                    Row(
                        "relay admin GET (env Authorization)",
                        "OK",
                        f"version={j.get('version')!r}; entries={n} (token not logged)",
                        st,
                    ),
                )
            else:
                parts: list[str] = [f"HTTP {st}"]
                if isinstance(j, dict):
                    if j.get("reason") is not None:
                        parts.append(f"reason={j.get('reason')!r}")
                    if j.get("token_sub") is not None:
                        parts.append(f"token_sub={j.get('token_sub')!r}")
                    if j.get("expected_did") is not None:
                        parts.append(f"expected_did={j.get('expected_did')!r}")
                    parts.append(
                        "copy from DevTools → Network → allowlist/v1 → Request Headers → Authorization",
                    )
                else:
                    parts.append(repr(body[:160]))
                rows.append(
                    Row(
                        "relay admin GET (env Authorization)",
                        "FAIL",
                        "; ".join(parts),
                        st,
                    ),
                )
        except RuntimeError as e:
            rows.append(Row("relay admin GET (env Authorization)", "FAIL", str(e), None))

    # --- Allowlist check ---
    sample_did = hints.get("sample_allowlist_did") or "did:plc:7mnpet2pvof2llhpcwattscf"
    try:
        q = quote(sample_did, safe="")
        st, hdrs, body = http(
            relay_origin.rstrip("/") + f"/allowlist/v1/check?did={q}",
        )
        j = _try_json(body)
        ok = st == 200 and isinstance(j, dict) and "allowed" in j and "version" in j
        rows.append(
            Row(
                "relay allowlist check",
                "OK" if ok else "FAIL",
                f"sample_did={sample_did!r}; body={body[:200]!r}",
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("relay allowlist check", "FAIL", str(e), None))

    # --- CORS preflight (app origin → relay) ---
    try:
        st, hdrs, body = http(
            relay_origin.rstrip("/") + "/admin/allowlist/v1",
            method="OPTIONS",
            headers={
                "Origin": app_origin.rstrip("/"),
                "Access-Control-Request-Method": "GET",
            },
        )
        acao = hdrs.get("access-control-allow-origin", "")
        ok = st in (204, 200) and acao != ""
        rows.append(
            Row(
                "relay CORS preflight (admin)",
                "OK" if ok else "WARN",
                f"access-control-allow-origin={acao!r}",
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("relay CORS preflight (admin)", "WARN", str(e), None))

    # --- App index ---
    try:
        st, hdrs, body = http(app_origin.rstrip("/") + "/")
        ct = hdrs.get("content-type", "").lower()
        ok = st == 200 and "text/html" in ct
        html = body.decode("utf-8", errors="replace")
        sha, sha_method = _extract_build_git_sha(html)
        hints = _html_document_hints(html)
        hint_s = ""
        if hints.get("parser") == "bs4":
            hint_s = f"; html_title={hints.get('title')!r}; script_tags={hints.get('script_count')}"
        rows.append(
            Row(
                "app GET /",
                "OK" if ok else "FAIL",
                f"build_git_sha_comment={sha!r} ({sha_method}){hint_s}; content-type={hdrs.get('content-type', '')!r}",
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("app GET /", "FAIL", str(e), None))

    # --- OAuth client metadata ---
    try:
        meta_url = urljoin(app_origin.rstrip("/") + "/", "oauth-client-metadata.json")
        st, hdrs, body = http(meta_url)
        j = _try_json(body)
        ok = (
            st == 200
            and isinstance(j, dict)
            and "client_id" in j
            and "redirect_uris" in j
        )
        rows.append(
            Row(
                "app oauth-client-metadata.json",
                "OK" if ok else "FAIL",
                f"client_id={j.get('client_id')!r}"
                if isinstance(j, dict)
                else repr(body[:160]),
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("app oauth-client-metadata.json", "FAIL", str(e), None))

    # --- App well-known (expect SPA HTML, not OAuth JSON) ---
    try:
        st, hdrs, body = http(app_origin.rstrip("/") + "/.well-known/oauth-authorization-server")
        j = _try_json(body)
        is_json = isinstance(j, dict) and "issuer" in j
        html = body.decode("utf-8", errors="replace")
        doc = _html_document_hints(html)
        if not is_json and st == 200:
            if doc.get("parser") == "bs4":
                detail = (
                    "SPA/HTML expected on app origin (OAuth AS metadata is on bsky.social / your PDS). "
                    f"bs4: title={doc.get('title')!r}, scripts={doc.get('script_count')}"
                )
            else:
                detail = (
                    "Non-JSON body (install beautifulsoup4 for HTML structure hints). "
                    "OAuth metadata is not served from the game origin."
                )
        elif is_json:
            detail = f"issuer={j.get('issuer')!r}"
        else:
            detail = repr(body[:160])
        rows.append(
            Row(
                "app /.well-known/oauth-authorization-server",
                "WARN" if not is_json and st == 200 else ("OK" if is_json else "WARN"),
                detail,
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("app /.well-known/oauth-authorization-server", "WARN", str(e), None))

    # --- Bluesky issuer metadata ---
    try:
        st, hdrs, body = http(BSKY_OAUTH_METADATA, headers={"Accept": "application/json"})
        j = _try_json(body)
        ok = st == 200 and isinstance(j, dict) and j.get("issuer")
        rows.append(
            Row(
                "external bsky oauth-authorization-server",
                "OK" if ok else "FAIL",
                f"issuer={j.get('issuer')!r}" if isinstance(j, dict) else repr(body[:120]),
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row("external bsky oauth-authorization-server", "FAIL", str(e), None))

    # --- Bluesky OAuth JWKS (relay admin verifies JWTs against AS keys) ---
    try:
        st_meta, _hm, body_meta = http(BSKY_OAUTH_METADATA, headers={"Accept": "application/json"})
        j_meta = _try_json(body_meta)
        jwks_uri = j_meta.get("jwks_uri") if isinstance(j_meta, dict) else None
        if not isinstance(jwks_uri, str) or jwks_uri == "":
            rows.append(
                Row(
                    "external bsky oauth JWKS",
                    "WARN",
                    "no jwks_uri in AS metadata",
                    st_meta,
                )
            )
        else:
            st_j, _hj, body_j = http(jwks_uri, headers={"Accept": "application/json"})
            jw = _try_json(body_j)
            keys = jw.get("keys") if isinstance(jw, dict) else None
            n = len(keys) if isinstance(keys, list) else -1
            ok = st_j == 200 and n > 0
            rows.append(
                Row(
                    "external bsky oauth JWKS",
                    "OK" if ok else "WARN",
                    f"keys={n} url={jwks_uri!r} — if keys=0, set Worker ATDANCE_OAUTH_AS_JWKS_JSON or _URL",
                    st_j,
                )
            )
    except RuntimeError as e:
        rows.append(Row("external bsky oauth JWKS", "WARN", str(e), None))

    # --- Resolve admin handle from wrangler ---
    handle = hints.get("admin_handle") or "distributed.camp"
    try:
        st, hdrs, body = http(
            BSKY_RESOLVE + "?handle=" + quote(handle, safe=""),
            headers={"Accept": "application/json"},
        )
        j = _try_json(body)
        ok = st == 200 and isinstance(j, dict) and str(j.get("did", "")).startswith("did:")
        rows.append(
            Row(
                f"external resolveHandle @{handle}",
                "OK" if ok else "WARN",
                f"did={j.get('did')!r}" if isinstance(j, dict) else repr(body[:120]),
                st,
            )
        )
    except RuntimeError as e:
        rows.append(Row(f"external resolveHandle @{handle}", "WARN", str(e), None))

    # --- WebSocket (optional) ---
    if relay_wss:
        st, msg = _ws_probe(relay_wss, insecure_tls=insecure_tls)
        rows.append(Row("relay WebSocket upgrade", st, msg, None))
    else:
        rows.append(Row("relay WebSocket upgrade", "SKIP", "set ATDANCE_DIAG_RELAY_WSS or pass --relay-wss", None))

    # --- Cloudflare API ---
    if cf_token and cf_account:
        names, msg = _cloudflare_workers(cf_token, cf_account, insecure_tls=insecure_tls)
        if names is None:
            rows.append(Row("cloudflare workers list", "WARN", msg, None))
        else:
            expect = hints.get("worker_name")
            found = expect in names if expect else True
            rows.append(
                Row(
                    "cloudflare workers list",
                    "OK" if found else "WARN",
                    f"expect_script={expect!r}; scripts={sorted(names)[:20]}{'…' if len(names) > 20 else ''}",
                    200,
                )
            )
    elif cf_token or cf_account:
        rows.append(
            Row(
                "cloudflare workers list",
                "SKIP",
                "set both CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID",
                None,
            )
        )
    else:
        rows.append(
            Row(
                "cloudflare workers list",
                "SKIP",
                "optional: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID",
                None,
            )
        )

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="ATDance deployment diagnostics")
    parser.add_argument(
        "--app-origin",
        default=_env_origin("ATDANCE_DIAG_APP_ORIGIN", DEFAULT_APP_ORIGIN),
        help="Static app HTTPS origin",
    )
    parser.add_argument(
        "--relay-origin",
        default=_env_origin("ATDANCE_DIAG_RELAY_ORIGIN", DEFAULT_RELAY_ORIGIN),
        help="Relay Worker HTTPS origin",
    )
    parser.add_argument(
        "--relay-wss",
        default=None,
        help=f"Relay WebSocket URL (default: {DEFAULT_RELAY_WSS}; use --skip-ws to skip)",
    )
    parser.add_argument(
        "--skip-ws",
        action="store_true",
        help="Do not probe WebSocket upgrade",
    )
    parser.add_argument(
        "--wrangler",
        default=WRANGLER_PATH,
        help="Path to relay/wrangler.toml",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON to stdout",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Skip TLS certificate verification (local CA issues only)",
    )
    args = parser.parse_args()
    if args.skip_ws:
        relay_wss = None
    elif args.relay_wss is not None:
        relay_wss = args.relay_wss.strip() or None
    elif "ATDANCE_DIAG_RELAY_WSS" in os.environ:
        relay_wss = os.environ["ATDANCE_DIAG_RELAY_WSS"].strip() or None
    else:
        relay_wss = DEFAULT_RELAY_WSS

    cf_token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip() or None
    cf_account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip() or None

    insecure_tls = args.insecure or (
        os.environ.get("ATDANCE_DIAG_INSECURE_SSL", "").strip().lower() in ("1", "true", "yes")
    )

    rows = run_checks(
        args.app_origin,
        args.relay_origin,
        relay_wss,
        args.wrangler,
        cf_token,
        cf_account,
        insecure_tls=insecure_tls,
    )

    if args.json:
        out = [asdict(r) for r in rows]
        if insecure_tls:
            out.append(
                {
                    "check": "_meta",
                    "status": "WARN",
                    "detail": "insecure_tls: certificate verification was disabled",
                    "http_status": None,
                },
            )
        print(json.dumps(out, indent=2))
    else:
        w = max(len(r.check) for r in rows)
        for r in rows:
            hs = f" {r.http_status}" if r.http_status is not None else ""
            print(f"{r.status:4} {r.check:{w}}{hs}  {r.detail}")
        if insecure_tls:
            print(
                "\nWARN  TLS verification was disabled (--insecure / ATDANCE_DIAG_INSECURE_SSL). "
                "Use default verification on machines with a proper CA bundle.",
                file=sys.stderr,
            )

    failed = sum(1 for r in rows if r.status == "FAIL")
    if failed:
        print(f"\n{failed} check(s) FAILED", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
