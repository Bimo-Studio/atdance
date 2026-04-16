/**
 * `oauth-client-browser` registers loopback redirect URIs with hostname `127.0.0.1` (not
 * `localhost`). During `BrowserOAuthClient.init()`, `fixLocation()` full-page navigates
 * from `localhost` → `127.0.0.1` after JS has started — causing a UI flash and a dropped
 * Vite HMR socket (often reported as the tab “losing connection”).
 *
 * @returns href to redirect to, or `null` if no redirect is needed
 */
export function loopbackUrlFromLocalhost(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname !== 'localhost') {
      return null;
    }
    u.hostname = '127.0.0.1';
    return u.href;
  } catch {
    return null;
  }
}
