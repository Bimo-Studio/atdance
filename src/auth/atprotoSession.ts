import type { OAuthSession } from '@atproto/oauth-client-browser';

import { createAtprotoOAuthClient } from '@/auth/streamplaceOAuth';

let cachedSession: OAuthSession | null = null;

/** Last OAuth session from `BrowserOAuthClient.init()` (plan Phase 3.2 — not localStorage). */
export function getAtprotoOAuthSession(): OAuthSession | null {
  return cachedSession;
}

/**
 * Call once on boot; restores session after OAuth redirect (IndexedDB via oauth-client-browser).
 */
export async function initAtprotoSessionOnBoot(): Promise<void> {
  const client = createAtprotoOAuthClient();
  if (!client) {
    cachedSession = null;
    return;
  }
  try {
    const r = await client.init();
    cachedSession = r?.session ?? null;
  } catch {
    cachedSession = null;
  }
}

/** Test-only reset. */
export function resetAtprotoSessionForTests(): void {
  cachedSession = null;
}
