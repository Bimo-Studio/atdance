/**
 * Browser OAuth client factory (plan Phase 3.2).
 * Requires `VITE_ATPROTO_PDS_HOST` (self-hosted PDS / handle resolver).
 * When unset, the app stays anonymous-only until configured.
 */
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export function createBrowserOAuthClient(): BrowserOAuthClient | null {
  const pds = import.meta.env.VITE_ATPROTO_PDS_HOST;
  if (pds === undefined || pds === '') {
    return null;
  }
  return new BrowserOAuthClient({
    handleResolver: pds,
    /** Loopback dev: OAuth servers accept implicit metadata (see oauth-client-browser README). */
    clientMetadata: undefined,
  });
}
