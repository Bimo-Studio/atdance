import type { OAuthSession } from '@atproto/oauth-client-browser';
import { formatAtprotoSignInErrorMessage } from '@/auth/atprotoSignInUserMessage';
import { normalizeAtprotoHandleInput } from '@/auth/normalizeAtprotoHandleInput';
import {
  getAtprotoOAuthSession,
  initAtprotoSessionOnBoot,
  signOutAtprotoSession,
} from '@/auth/atprotoSession';
import { atprotoSignInRedirectOptions } from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';
import { formatRelayAllowlistFetchError } from '@/admin/formatRelayAllowlistFetchError';
import {
  fetchBskyHandleForDid,
  resolveAtHandleToDid,
  searchActorsTypeahead,
} from '@/bsky/publicAppview';
import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

export const ADMIN_UI_HANDLE = 'distributed.camp';

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

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = relayOrigin();
  if (origin === null) {
    throw new Error('Missing VITE_RELAY_WS or VITE_RELAY_HTTP');
  }
  const session = getAtprotoOAuthSession();
  if (session === null) {
    throw new Error('Not signed in');
  }
  const base = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${p}`;
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return (session as OAuthSession).fetchHandler(url, { ...init, headers });
}

/** User-visible hint for relay `admin_auth_failed` JSON `reason` (deployed relay must return this body). */
function adminAuthReasonUserHint(reason: string): string {
  switch (reason) {
    case 'forbidden':
      return 'Your token’s DID does not match the DID for the configured admin handle.';
    case 'jwt_verify':
    case 'invalid_token':
      return 'The access token could not be verified (try Sign out, then sign in again).';
    case 'admin_api_token_mismatch':
      return 'Authorization Bearer does not match Worker secret ATDANCE_ADMIN_API_TOKEN (re-run wrangler secret put; same string as in curl).';
    case 'jwks_empty':
      return 'Your OAuth server’s published JWKS has no public keys. Operator: set ATDANCE_OAUTH_AS_JWKS_JSON / _URL, or ATDANCE_ADMIN_API_TOKEN and use curl for /admin APIs until JWKS works.';
    case 'issuer_metadata':
    case 'jwks':
      return 'The relay could not load your OAuth server’s signing keys (check issuer reachability).';
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

export async function mountAdminApp(root: HTMLElement): Promise<void> {
  appendNodes(root, [el('h1', {}, ['ATDance allowlist'])]);

  await initAtprotoSessionOnBoot();
  const session = getAtprotoOAuthSession();

  if (session === null || !session.sub.startsWith('did:')) {
    const box = el('div', { class: 'al-card' });
    const st = el('p', {}, ['Sign in with the same ATProto account you use in the game.']);
    const feedback = el('p', {
      class: 'al-muted al-signin-feedback',
      role: 'status',
    }) as HTMLParagraphElement;
    const input = el('input', {
      type: 'text',
      class: 'al-input',
      placeholder: 'handle.example.com',
    }) as HTMLInputElement;
    const btn = el('button', { type: 'button', class: 'al-btn' }, ['Sign in']) as HTMLButtonElement;
    const doSignIn = (): void => {
      void (async () => {
        feedback.textContent = '';
        feedback.classList.remove('al-signin-feedback--warn');
        const h = normalizeAtprotoHandleInput(input.value);
        if (!h) {
          feedback.textContent = 'Enter your handle.';
          feedback.classList.add('al-signin-feedback--warn');
          return;
        }
        if (btn.disabled) {
          return;
        }
        btn.disabled = true;
        feedback.textContent = 'Starting sign-in…';
        try {
          const client = await loadAtprotoOAuthClient();
          if (!client) {
            feedback.textContent =
              'OAuth is not configured for this deployment (missing or empty VITE_ATPROTO_PDS_HOST).';
            feedback.classList.add('al-signin-feedback--warn');
            return;
          }
          await client.signInRedirect(h, atprotoSignInRedirectOptions(window.location));
        } catch (e) {
          feedback.textContent = formatAtprotoSignInErrorMessage(e);
          feedback.classList.add('al-signin-feedback--warn');
          console.error('[admin] OAuth sign-in', e);
        } finally {
          btn.disabled = false;
        }
      })();
    };
    btn.addEventListener('click', doSignIn);
    input.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') {
        return;
      }
      ev.preventDefault();
      doSignIn();
    });
    appendNodes(box, [st, feedback, input, btn]);
    root.appendChild(box);
    return;
  }

  const adminDid = await resolveAtHandleToDid(ADMIN_UI_HANDLE);
  if (adminDid === null) {
    const err = el('div', { class: 'al-card al-error' });
    appendNodes(err, [
      el('p', {}, [
        `Could not resolve @${ADMIN_UI_HANDLE} to a DID (directory unavailable or handle not found).`,
      ]),
    ]);
    root.appendChild(err);
    return;
  }

  if (session.sub !== adminDid) {
    const handle = await fetchBskyHandleForDid(session.sub);
    const denied = el('div', { class: 'al-card al-error' });
    appendNodes(denied, [el('p', {}, [`Signed in as @${handle ?? session.sub} — access denied.`])]);
    const signOutBtn = el('button', { type: 'button', class: 'al-btn' }, [
      'Sign out',
    ]) as HTMLButtonElement;
    signOutBtn.addEventListener('click', () => {
      void signOutAtprotoSession().then(() => window.location.reload());
    });
    denied.appendChild(signOutBtn);
    root.appendChild(denied);
    return;
  }

  const shell = el('div', { class: 'al-shell' });
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
