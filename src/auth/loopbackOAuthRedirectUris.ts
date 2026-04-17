import type { AuthorizeOptions } from '@atproto/oauth-client';

/**
 * sessionStorage key: pathname + search to open after OAuth completes on the **app root** `/`.
 * Set by `/admin` sign-in so one Bluesky consent can serve both the game and admin (same IndexedDB session).
 */
export const ATDANCE_OAUTH_POST_LOGIN_NAV_KEY = 'atdance_oauth_post_login_path';

/**
 * Registered `redirect_uri` that always targets the site root (`https://host/` or loopback `http://127.0.0.1:port/`).
 * Use with {@link ATDANCE_OAUTH_POST_LOGIN_NAV_KEY} when signing in from `/admin` so the callback is handled by the main bundle’s boot path.
 */
export function canonicalOAuthAppRootRedirectUri(loc: Pick<Location, 'origin'>): string {
  const u = new URL(loc.origin);
  if (u.protocol === 'http:' && u.hostname === 'localhost') {
    u.hostname = '127.0.0.1';
  }
  return `${u.protocol}//${u.host}/`;
}

/**
 * Redirect URIs for ATProto **loopback** OAuth (dev). RFC 8252: loopback redirects must use
 * the numeric IP (e.g. `127.0.0.1`), not `localhost`.
 *
 * Includes `/` and `/admin` so sign-in works from the main app and the admin MPA.
 */
export function atdanceLoopbackRedirectUris(origin: string): [string, ...string[]] {
  const u = new URL(origin);
  if (u.protocol !== 'http:') {
    throw new TypeError(`Expected http: loopback origin, got ${origin}`);
  }
  if (u.hostname === 'localhost') {
    u.hostname = '127.0.0.1';
  }
  const base = `${u.protocol}//${u.host}`;
  return [`${base}/`, `${base}/admin`, `${base}/admin/`];
}

/**
 * `redirect_uri` for `OAuthClient.signInRedirect` so the IdP returns to the same page.
 * Matches the `/`, `/admin`, `/admin/` entries in {@link atdanceLoopbackRedirectUris} and
 * {@link oauthClientMetadataObject}. On `http://localhost`, normalizes to `127.0.0.1` like
 * loopback registration (RFC 8252).
 */
export function currentAtdanceOAuthRedirectUri(loc: {
  origin: string;
  pathname: string;
}): string | undefined {
  const u = new URL(loc.origin);
  if (u.protocol === 'http:' && u.hostname === 'localhost') {
    u.hostname = '127.0.0.1';
  }
  const base = `${u.protocol}//${u.host}`;
  const pathname = loc.pathname === '' ? '/' : loc.pathname;
  if (pathname === '/') {
    return `${base}/`;
  }
  if (pathname === '/admin') {
    return `${base}/admin`;
  }
  if (pathname === '/admin/') {
    return `${base}/admin/`;
  }
  return undefined;
}

/** Options for `signInRedirect` when on a registered ATDance path. */
export function atprotoSignInRedirectOptions(
  loc: Pick<Location, 'origin' | 'pathname'>,
): AuthorizeOptions | undefined {
  const redirect_uri = currentAtdanceOAuthRedirectUri(loc);
  return redirect_uri === undefined
    ? undefined
    : { redirect_uri: redirect_uri as AuthorizeOptions['redirect_uri'] };
}
