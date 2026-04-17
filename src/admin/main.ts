import { formatRelayAllowlistFetchError } from '@/admin/formatRelayAllowlistFetchError';
import { resolveAtHandleToDid, searchActorsTypeahead } from '@/bsky/publicAppview';
import { ATDANCE_OPERATOR_ADMIN_HANDLE } from '@/config/operatorAdminHandle';
import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

export const ADMIN_UI_HANDLE = ATDANCE_OPERATOR_ADMIN_HANDLE;

/** sessionStorage key for relay-issued admin session JWT after password login. */
export const ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY = 'atdanceRelayAdminSessionJwt';

function getStoredAdminSessionJwt(): string | null {
  try {
    const t = globalThis.sessionStorage?.getItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY)?.trim();
    return t !== undefined && t !== '' ? t : null;
  } catch {
    return null;
  }
}

interface AllowlistEntry {
  did: string;
  handle: string;
}

interface ListResponse {
  adminHandle: string;
  version: number;
  entries: AllowlistEntry[];
}

function appendNodes(parent: Node, children: (Node | string)[]): void {
  for (const c of children) {
    parent.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | undefined>,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) {
      n.setAttribute(k, v);
    }
  }
  appendNodes(n, children);
  return n;
}

function relayOrigin(): string | null {
  return relayHttpOriginFromEnv(import.meta.env);
}

async function fetchAdminSessionOptions(origin: string): Promise<{ passwordLogin: boolean }> {
  const base = origin.replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/admin/session/v1/options`);
    if (!r.ok) {
      return { passwordLogin: false };
    }
    const j = (await r.json()) as { passwordLogin?: unknown };
    return { passwordLogin: j.passwordLogin === true };
  } catch {
    return { passwordLogin: false };
  }
}

async function postAdminPasswordLogin(
  origin: string,
  password: string,
): Promise<{ ok: true; access_token: string } | { ok: false; message: string }> {
  const base = origin.replace(/\/$/, '');
  const r = await fetch(`${base}/admin/session/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  let j: Record<string, unknown> = {};
  try {
    j = (await r.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (r.status === 401 && j.error === 'invalid_credentials') {
      return { ok: false, message: 'Incorrect password.' };
    }
    if (j.error === 'admin_login_unconfigured' || j.error === 'admin_session_secret_unconfigured') {
      return {
        ok: false,
        message:
          'Relay admin sign-in is not fully configured. The operator must set ATDANCE_ADMIN_PASSWORD and ATDANCE_ADMIN_SESSION_SECRET on the relay.',
      };
    }
    if (j.error === 'admin_session_mint_failed') {
      return {
        ok: false,
        message: 'Could not start a session (relay could not resolve the admin account).',
      };
    }
    return {
      ok: false,
      message: typeof j.error === 'string' ? j.error : `Error ${r.status}`,
    };
  }
  const tok = j.access_token;
  if (typeof tok !== 'string' || tok === '') {
    return { ok: false, message: 'Invalid response from relay.' };
  }
  return { ok: true, access_token: tok };
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = relayOrigin();
  if (origin === null) {
    throw new Error('Missing VITE_RELAY_WS or VITE_RELAY_HTTP');
  }
  const base = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${p}`;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const jwt = getStoredAdminSessionJwt();
  if (jwt === null) {
    throw new Error('Not signed in');
  }
  headers.set('Authorization', `Bearer ${jwt}`);
  return fetch(url, { ...init, headers });
}

/** User-visible hint for relay `admin_auth_failed` JSON `reason` (deployed relay must return this body). */
function adminAuthReasonUserHint(reason: string): string {
  switch (reason) {
    case 'forbidden':
      return 'Your session’s DID does not match the DID for the configured admin handle.';
    case 'jwt_verify':
    case 'invalid_token':
      return 'Your session could not be verified (try Sign out, then sign in again).';
    case 'admin_api_token_mismatch':
      return 'Authorization Bearer does not match the relay’s configured API token.';
    case 'jwks_empty':
      return 'OAuth JWKS had no keys (use password sign-in or configure JWKS on the relay).';
    case 'issuer_metadata':
    case 'jwks':
      return 'The relay could not load OAuth signing keys.';
    case 'sub':
      return 'The access token has no ATProto DID in sub.';
    case 'admin_handle':
      return 'The relay could not resolve ATDANCE_ADMIN_HANDLE via the public Bluesky API.';
    case 'missing_bearer':
      return 'No Authorization bearer was sent.';
    default:
      return reason;
  }
}

async function readAdminHttpErrorLine(r: Response): Promise<string> {
  const fallback =
    r.status === 403
      ? 'Not authorized (admin only).'
      : r.status === 401
        ? 'Not signed in (missing token).'
        : `Error ${r.status}`;
  try {
    const j = (await r.json()) as {
      error?: string;
      reason?: string;
      token_sub?: string;
      expected_did?: string;
    };
    if (j.error !== 'admin_auth_failed' || typeof j.reason !== 'string') {
      return fallback;
    }
    const didHint =
      j.reason === 'forbidden' &&
      typeof j.token_sub === 'string' &&
      typeof j.expected_did === 'string'
        ? `Token sub ${j.token_sub} ≠ relay expected ${j.expected_did}. `
        : '';
    return `${fallback} — ${didHint}${adminAuthReasonUserHint(j.reason)}`;
  } catch {
    return fallback;
  }
}

async function loadList(root: HTMLElement, status: HTMLElement): Promise<void> {
  status.textContent = 'Loading…';
  try {
    const r = await adminFetch('/admin/allowlist/v1');
    if (!r.ok) {
      status.textContent = await readAdminHttpErrorLine(r);
      return;
    }
    const data = (await r.json()) as ListResponse;
    status.textContent = `Version ${data.version}`;
    renderTable(root, data.entries);
  } catch (e) {
    status.textContent = formatRelayAllowlistFetchError(e);
  }
}

let selectedDid: string | null = null;

/** Test helper: clear row selection between cases. */
export function resetAdminTableSelectionForTests(): void {
  selectedDid = null;
}

function renderTable(container: HTMLElement, entries: AllowlistEntry[]): void {
  container.replaceChildren();
  const table = el('table', { class: 'al-table' });
  const thead = el('thead', {}, [el('tr', {}, [el('th', {}, ['Handle']), el('th', {}, ['DID'])])]);
  const tb = el('tbody', {});
  for (const row of entries) {
    const tr = el('tr', {
      class: 'al-row',
      'data-did': row.did,
    });
    if (selectedDid === row.did) {
      tr.classList.add('al-row--selected');
    }
    tr.addEventListener('click', () => {
      selectedDid = row.did;
      renderTable(container, entries);
    });
    appendNodes(tr, [
      el('td', {}, [row.handle ? `@${row.handle}` : '—']),
      el('td', { class: 'al-mono' }, [row.did]),
    ]);
    tb.appendChild(tr);
  }
  appendNodes(table, [thead, tb]);
  container.appendChild(table);
}

function mountPasswordForm(root: HTMLElement, origin: string): void {
  const box = el('div', { class: 'al-card' });
  appendNodes(box, [
    el('p', { class: 'al-token-setup-lead' }, ['Sign in']),
    el('p', { class: 'al-muted' }, [
      'Enter the admin password for this relay. It is set by the operator (not your Bluesky password).',
    ]),
  ]);
  const feedback = el('p', {
    class: 'al-muted al-signin-feedback',
    role: 'status',
  }) as HTMLParagraphElement;
  const pwInput = el('input', {
    type: 'password',
    class: 'al-input',
    placeholder: 'Admin password',
    autocomplete: 'current-password',
  }) as HTMLInputElement;
  const btn = el('button', { type: 'button', class: 'al-btn al-btn--primary' }, [
    'Sign in',
  ]) as HTMLButtonElement;
  const submit = (): void => {
    void (async () => {
      feedback.textContent = '';
      feedback.classList.remove('al-signin-feedback--warn');
      const password = pwInput.value;
      if (password === '') {
        feedback.textContent = 'Enter the admin password.';
        feedback.classList.add('al-signin-feedback--warn');
        return;
      }
      btn.disabled = true;
      feedback.textContent = 'Signing in…';
      try {
        const res = await postAdminPasswordLogin(origin, password);
        if (!res.ok) {
          feedback.textContent = res.message;
          feedback.classList.add('al-signin-feedback--warn');
          return;
        }
        globalThis.sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, res.access_token);
        window.location.reload();
      } catch (e) {
        feedback.textContent = e instanceof Error ? e.message : 'Sign-in failed.';
        feedback.classList.add('al-signin-feedback--warn');
      } finally {
        btn.disabled = false;
      }
    })();
  };
  btn.addEventListener('click', submit);
  pwInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      submit();
    }
  });
  appendNodes(box, [pwInput, feedback, btn]);
  root.appendChild(box);
}

async function mountAdminShell(root: HTMLElement): Promise<void> {
  const shell = el('div', { class: 'al-shell' });
  const sessionRow = el('div', { class: 'al-card al-token-banner' });
  const signOutBtn = el('button', { type: 'button', class: 'al-btn' }, [
    'Sign out',
  ]) as HTMLButtonElement;
  signOutBtn.addEventListener('click', () => {
    try {
      globalThis.sessionStorage.removeItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  });
  appendNodes(sessionRow, [
    el('p', { class: 'al-muted' }, [
      'Signed in to relay admin. Sign out on shared devices when finished.',
    ]),
    signOutBtn,
  ]);
  shell.appendChild(sessionRow);

  const status = el('p', { class: 'al-muted' }, ['']);
  const tableHost = el('div', {});

  const addRow = el('div', { class: 'al-add' });
  const input = el('input', {
    type: 'text',
    class: 'al-input',
    placeholder: 'did:plc:… or @handle for suggestions',
  }) as HTMLInputElement;
  const suggest = el('div', { class: 'al-suggest', hidden: '' });
  const addBtn = el('button', { type: 'button', class: 'al-btn al-btn--primary' }, [
    'Add',
  ]) as HTMLButtonElement;
  const removeBtn = el('button', { type: 'button', class: 'al-btn al-btn--danger' }, [
    'Remove selected',
  ]) as HTMLButtonElement;

  let suggestTimer: ReturnType<typeof setTimeout> | null = null;
  input.addEventListener('input', () => {
    if (suggestTimer !== null) {
      clearTimeout(suggestTimer);
    }
    const v = input.value;
    if (!v.startsWith('@')) {
      suggest.hidden = true;
      suggest.replaceChildren();
      return;
    }
    suggestTimer = setTimeout(() => {
      void (async () => {
        const opts = await searchActorsTypeahead(v, 8);
        suggest.replaceChildren();
        for (const o of opts) {
          const b = el('button', { type: 'button', class: 'al-suggest-item' }, [
            `@${o.handle} · ${o.did}`,
          ]);
          b.addEventListener('click', () => {
            input.value = o.did;
            suggest.hidden = true;
          });
          suggest.appendChild(b);
        }
        suggest.hidden = opts.length === 0;
      })();
    }, 200);
  });

  addBtn.addEventListener('click', () => {
    void (async () => {
      try {
        const raw = input.value.trim();
        if (!raw) {
          return;
        }
        let body: { did?: string; handle?: string };
        if (raw.startsWith('did:')) {
          body = { did: raw };
        } else {
          const h = raw.replace(/^@/, '');
          const did = await resolveAtHandleToDid(h);
          if (did === null) {
            status.textContent = 'Could not resolve handle.';
            return;
          }
          body = { did, handle: h.toLowerCase() };
        }
        const r = await adminFetch('/admin/allowlist/v1/add', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          status.textContent = `Add failed (${r.status}). ${await readAdminHttpErrorLine(r)}`;
          return;
        }
        input.value = '';
        suggest.hidden = true;
        const data = (await r.json()) as { entries: AllowlistEntry[] };
        status.textContent = 'Saved.';
        renderTable(tableHost, data.entries);
      } catch (e) {
        status.textContent = formatRelayAllowlistFetchError(e);
      }
    })();
  });

  removeBtn.addEventListener('click', () => {
    void (async () => {
      try {
        if (selectedDid === null) {
          status.textContent = 'Select a row first.';
          return;
        }
        const r = await adminFetch('/admin/allowlist/v1/remove', {
          method: 'POST',
          body: JSON.stringify({ did: selectedDid }),
        });
        if (!r.ok) {
          status.textContent = `Remove failed (${r.status}). ${await readAdminHttpErrorLine(r)}`;
          return;
        }
        selectedDid = null;
        const data = (await r.json()) as { entries: AllowlistEntry[] };
        status.textContent = 'Removed.';
        renderTable(tableHost, data.entries);
      } catch (e) {
        status.textContent = formatRelayAllowlistFetchError(e);
      }
    })();
  });

  appendNodes(addRow, [input, suggest, addBtn, removeBtn]);
  appendNodes(shell, [status, addRow, tableHost]);
  root.appendChild(shell);

  await loadList(tableHost, status);
}

export async function mountAdminApp(root: HTMLElement): Promise<void> {
  appendNodes(root, [
    el('h1', {}, ['ATDance']),
    el('p', { class: 'al-muted' }, [
      'Invite-only guest list for this game. If you opened this link by accident, you can close the tab or go back to the game—nothing here is required to play.',
    ]),
  ]);

  const origin = relayOrigin();
  if (origin === null) {
    const err = el('div', { class: 'al-card al-error' });
    appendNodes(err, [
      el('p', {}, [
        'This page needs a relay URL (set VITE_RELAY_HTTP or VITE_RELAY_WS in the app build).',
      ]),
    ]);
    root.appendChild(err);
    return;
  }

  const { passwordLogin } = await fetchAdminSessionOptions(origin);
  if (!passwordLogin) {
    const err = el('div', { class: 'al-card al-error' });
    appendNodes(err, [
      el('p', {}, [
        'Browser admin sign-in is not enabled on this relay yet. The operator must set ATDANCE_ADMIN_PASSWORD and ATDANCE_ADMIN_SESSION_SECRET (see relay deployment docs), then redeploy.',
      ]),
    ]);
    root.appendChild(err);
    return;
  }

  if (getStoredAdminSessionJwt() === null) {
    mountPasswordForm(root, origin);
    return;
  }

  await mountAdminShell(root);
}
