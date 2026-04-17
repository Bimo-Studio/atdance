import type { AuthorizeOptions } from '@atproto/oauth-client';
import type { OAuthSession } from '@atproto/oauth-client-browser';

import { clearInviteRelayGate, resetInviteRelayGateForTests } from '@/auth/inviteRelayGate';
import {
  ATDANCE_OAUTH_POST_LOGIN_NAV_KEY,
  atprotoSignInRedirectOptions,
} from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';

let cachedSession: OAuthSession | null = null;

/** Avoid hung admin / boot when `init()` waits on network or callback edge cases. */
const SESSION_INIT_DEADLINE_MS = 20_000;

/** Last OAuth session from `BrowserOAuthClient` restore/callback (IndexedDB via oauth-client-browser). */
export function getAtprotoOAuthSession(): OAuthSession | null {
  return cachedSession;
}

function locationForOAuthRedirect(): Pick<Location, 'origin' | 'pathname'> {
  if (typeof globalThis.window === 'undefined') {
    return { origin: 'http://127.0.0.1', pathname: '/' };
  }
  return window.location;
}

/**
 * Call once on boot; restores session after OAuth redirect (IndexedDB via oauth-client-browser).
 * Uses `initCallback` only when the URL carries OAuth callback params; otherwise `initRestore`
 * (avoids `init()` blocking the admin MPA on a clean `/admin` URL).
 */
export async function initAtprotoSessionOnBoot(): Promise<void> {
  const client = await loadAtprotoOAuthClient();
  if (!client) {
    cachedSession = null;
    return;
  }
  const redirectOpts = atprotoSignInRedirectOptions(locationForOAuthRedirect());
  const redirectUri = redirectOpts?.redirect_uri as AuthorizeOptions['redirect_uri'] | undefined;

  try {
    const run = async (): Promise<{ session: OAuthSession } | undefined> => {
      const params = client.readCallbackParams();
      if (params !== null) {
        const r = await client.initCallback(params, redirectUri);
        if (typeof globalThis.window !== 'undefined') {
          const nav = globalThis.window.sessionStorage.getItem(ATDANCE_OAUTH_POST_LOGIN_NAV_KEY);
          if (nav !== null && nav !== '' && nav.startsWith('/') && !nav.startsWith('//')) {
            globalThis.window.sessionStorage.removeItem(ATDANCE_OAUTH_POST_LOGIN_NAV_KEY);
            globalThis.window.location.replace(`${globalThis.window.location.origin}${nav}`);
          }
        }
        return r;
      }
      return await client.initRestore();
    };

    const r = await Promise.race([
      run(),
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), SESSION_INIT_DEADLINE_MS),
      ),
    ]);
    cachedSession = r?.session ?? null;
  } catch {
    cachedSession = null;
  }
}

/** Test-only reset. */
export function resetAtprotoSessionForTests(): void {
  cachedSession = null;
  resetInviteRelayGateForTests();
}

/** Clears IndexedDB session (invite revoked, sign-out button, etc.). */
export async function signOutAtprotoSession(): Promise<void> {
  const session = cachedSession;
  if (session === null) {
    return;
  }
  const sub = session.sub;
  try {
    await session.signOut();
  } finally {
    cachedSession = null;
    clearInviteRelayGate(sub);
  }
}
