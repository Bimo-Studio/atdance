import type { AuthorizeOptions } from '@atproto/oauth-client';
import type { OAuthSession } from '@atproto/oauth-client-browser';
import { formatAtprotoSignInErrorMessage } from '@/auth/atprotoSignInUserMessage';
import { normalizeAtprotoHandleInput } from '@/auth/normalizeAtprotoHandleInput';
import {
  getAtprotoOAuthSession,
  initAtprotoSessionOnBoot,
  signOutAtprotoSession,
} from '@/auth/atprotoSession';
import {
  ATDANCE_OAUTH_POST_LOGIN_NAV_KEY,
  canonicalOAuthAppRootRedirectUri,
} from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';
import { formatRelayAllowlistFetchError } from '@/admin/formatRelayAllowlistFetchError';
import {
  fetchBskyHandleForDid,
  resolveAtHandleToDid,
  searchActorsTypeahead,
} from '@/bsky/publicAppview';
import { ATDANCE_OPERATOR_ADMIN_HANDLE } from '@/config/operatorAdminHandle';
import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

export const ADMIN_UI_HANDLE = ATDANCE_OPERATOR_ADMIN_HANDLE;

/**
 * sessionStorage key for the same secret as Worker `ATDANCE_ADMIN_API_TOKEN`.
 * Bypasses OAuth JWT verification (needed while bsky.social publishes an empty JWKS).
 */
export const ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY = 'atdanceRelayAdminApiToken';

function getStoredRelayAdminApiToken(): string | null {
  try {
    const t = globalThis.sessionStorage?.getItem(ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY)?.trim();
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

  const apiTok = getStoredRelayAdminApiToken();
  if (apiTok !== null) {
    headers.set('Authorization', `Bearer ${apiTok}`);
    return fetch(url, { ...init, headers });
  }

  const session = getAtprotoOAuthSession();
  if (session === null) {
    throw new Error('Not signed in');
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
      return 'OAuth JWKS has no public keys (Bluesky). Use “Relay operator token” below with the same value as Worker ATDANCE_ADMIN_API_TOKEN, or set ATDANCE_OAUTH_AS_JWKS_JSON / _URL on the Worker.';
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
  appendNodes(root, [
    el('h1', {}, ['ATDance']),
    el('p', { class: 'al-muted' }, [
      'Invite-only guest list for this game. If you opened this link by accident, you can close the tab or go back to the game—nothing here is required to play.',
    ]),
  ]);

  await initAtprotoSessionOnBoot();
  const session = getAtprotoOAuthSession();
  const operatorTokenActive = getStoredRelayAdminApiToken() !== null;

  if (!operatorTokenActive && (session === null || !session.sub.startsWith('did:'))) {
    const box = el('div', { class: 'al-card' });
    const st = el('p', {}, [
      'Sign in with the same ATProto account you use in the game, or use an operator token if you run the relay.',
    ]);
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
          globalThis.sessionStorage.setItem(
            ATDANCE_OAUTH_POST_LOGIN_NAV_KEY,
            `${window.location.pathname}${window.location.search}`,
          );
          await client.signInRedirect(h, {
            redirect_uri: canonicalOAuthAppRootRedirectUri(
              window.location,
            ) as AuthorizeOptions['redirect_uri'],
          });
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

    const opSep = el('p', { class: 'al-muted' }, [
      'Or use a relay operator token (same secret as Worker ATDANCE_ADMIN_API_TOKEN). Stored in this browser tab only.',
    ]);
    const opInput = el('input', {
      type: 'password',
      class: 'al-input',
      placeholder: 'ATDANCE_ADMIN_API_TOKEN',
      autocomplete: 'off',
    }) as HTMLInputElement;
    const opFeedback = el('p', {
      class: 'al-muted al-signin-feedback',
      role: 'status',
    }) as HTMLParagraphElement;
    const opBtn = el('button', { type: 'button', class: 'al-btn' }, [
      'Save operator token',
    ]) as HTMLButtonElement;
    opBtn.addEventListener('click', () => {
      const raw = opInput.value.trim();
      if (raw === '') {
        opFeedback.textContent = 'Paste the token from wrangler secret.';
        opFeedback.classList.add('al-signin-feedback--warn');
        return;
      }
      try {
        globalThis.sessionStorage.setItem(ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY, raw);
        opFeedback.textContent = '';
        window.location.reload();
      } catch (e) {
        opFeedback.textContent = e instanceof Error ? e.message : 'Could not store token.';
        opFeedback.classList.add('al-signin-feedback--warn');
      }
    });

    appendNodes(box, [st, feedback, input, btn, opSep, opInput, opFeedback, opBtn]);
    root.appendChild(box);
    return;
  }

  if (!operatorTokenActive) {
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

    if (session !== null && session.sub !== adminDid) {
      const handle = await fetchBskyHandleForDid(session.sub);
      const denied = el('div', { class: 'al-card al-error' });
      appendNodes(denied, [
        el('p', {}, [
          `You’re signed in as @${handle ?? session.sub}. This account can’t change the guest list. If you need access, contact whoever runs this deployment.`,
        ]),
      ]);
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
  }

  const shell = el('div', { class: 'al-shell' });
  const status = el('p', { class: 'al-muted' }, ['']);
  const tableHost = el('div', {});

  if (operatorTokenActive) {
    const tokRow = el('div', { class: 'al-card al-token-banner' });
    const clearTok = el('button', { type: 'button', class: 'al-btn' }, [
      'Clear operator token',
    ]) as HTMLButtonElement;
    clearTok.addEventListener('click', () => {
      try {
        globalThis.sessionStorage.removeItem(ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY);
      } catch {
        /* ignore */
      }
      window.location.reload();
    });
    appendNodes(tokRow, [
      el('p', { class: 'al-muted' }, [
        'Admin API: relay operator token (not OAuth). Clear before leaving this browser if others use it.',
      ]),
      clearTok,
    ]);
    shell.appendChild(tokRow);
  }

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
