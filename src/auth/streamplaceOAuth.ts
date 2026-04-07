/**
 * ATProto OAuth client factory aligned with [Streamplace](https://github.com/streamplace/streamplace)
 * (`js/app` uses `@atproto/oauth-client` + `@atproto/oauth-client-browser`).
 *
 * **Loopback (localhost / 127.0.0.1 / ::1):** `clientMetadata` may be omitted — see
 * [@atproto/oauth-client-browser README](https://github.com/bluesky-social/atproto/blob/main/packages/oauth/oauth-client-browser/README.md).
 *
 * **HTTPS (Vercel, Cloudflare Pages, etc.):** use `BrowserOAuthClient.load` with a hosted
 * `client_id` URL. Build emits `oauth-client-metadata.json` when `VERCEL_URL`, `CF_PAGES_URL`,
 * or `VITE_PUBLIC_APP_ORIGIN` is set; otherwise set `VITE_ATPROTO_OAUTH_CLIENT_ID` or rely on
 * `${origin}/oauth-client-metadata.json` at runtime (file must exist in `dist`).
 */
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export type { BrowserOAuthClient };

/** @deprecated Use {@link createAtprotoOAuthClient} */
export const createBrowserOAuthClient = createAtprotoOAuthClient;

let clientPromise: Promise<BrowserOAuthClient | null> | null = null;

function isBrowserLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function resolveOAuthClientId(): string {
  const explicit = import.meta.env.VITE_ATPROTO_OAUTH_CLIENT_ID?.trim();
  if (explicit) {
    return explicit;
  }
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1/oauth-client-metadata.json';
  }
  return `${window.location.origin}/oauth-client-metadata.json`;
}

async function instantiateBrowserOAuthClient(): Promise<BrowserOAuthClient | null> {
  const handleResolver = import.meta.env.VITE_ATPROTO_PDS_HOST;
  if (handleResolver === undefined || handleResolver === '') {
    return null;
  }

  if (typeof window !== 'undefined' && isBrowserLoopbackHost(window.location.hostname)) {
    return new BrowserOAuthClient({
      handleResolver,
    });
  }

  return BrowserOAuthClient.load({
    clientId: resolveOAuthClientId(),
    handleResolver,
  });
}

/**
 * Resolves the browser OAuth client (async — required for HTTPS deployments).
 * Safe to call multiple times; shares one promise.
 */
export async function loadAtprotoOAuthClient(): Promise<BrowserOAuthClient | null> {
  if (clientPromise === null) {
    clientPromise = instantiateBrowserOAuthClient();
  }
  return clientPromise;
}

/**
 * Sync helper: only returns a client on **loopback** hosts. On production HTTPS hosts returns
 * `null` — use {@link loadAtprotoOAuthClient} instead.
 */
export function createAtprotoOAuthClient(): BrowserOAuthClient | null {
  const handleResolver = import.meta.env.VITE_ATPROTO_PDS_HOST;
  if (handleResolver === undefined || handleResolver === '') {
    return null;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  if (isBrowserLoopbackHost(window.location.hostname)) {
    return new BrowserOAuthClient({
      handleResolver,
    });
  }
  return null;
}

/** Vitest: reset cached promise between cases. */
export function resetAtprotoOAuthClientCacheForTests(): void {
  clientPromise = null;
}
