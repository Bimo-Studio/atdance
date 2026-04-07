/**
 * ATProto OAuth client factory aligned with [Streamplace](https://github.com/streamplace/streamplace)
 * (`js/app` uses `@atproto/oauth-client` + `@atproto/oauth-client-browser`).
 *
 * ATDance is a browser SPA: we use `BrowserOAuthClient` only (not Expo). Pin package versions with
 * Streamplace’s `js/app/package.json` when bumping dependencies.
 *
 * Dev: leave `clientMetadata` unset for loopback implicit metadata (see oauth-client-browser README).
 * Prod: set `VITE_ATPROTO_OAUTH_CLIENT_METADATA_URL` to fetch OAuth client metadata JSON, **or**
 * provide hosted client id via `BrowserOAuthClient.load` in a future iteration.
 */
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export type { BrowserOAuthClient };

/** @deprecated Use {@link createAtprotoOAuthClient} */
export const createBrowserOAuthClient = createAtprotoOAuthClient;

/**
 * Returns `null` when OAuth cannot run (missing PDS / handle resolver host).
 */
export function createAtprotoOAuthClient(): BrowserOAuthClient | null {
  const pds = import.meta.env.VITE_ATPROTO_PDS_HOST;
  if (pds === undefined || pds === '') {
    return null;
  }
  return new BrowserOAuthClient({
    handleResolver: pds,
    clientMetadata: undefined,
  });
}
