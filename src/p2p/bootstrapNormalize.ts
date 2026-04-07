/**
 * [hyperswarm-web](https://github.com/RangerMauve/hyperswarm-web) appends `/proxy` and `/signal`
 * to each **base** URL. If users paste full `…/proxy` URLs, strip to origin so we do not get `…/proxy/proxy`.
 */
export function normalizeHyperswarmBootstrapBases(urls: readonly string[]): string[] {
  return urls.map((u) => {
    try {
      const parsed = new URL(u);
      return parsed.origin;
    } catch {
      return u;
    }
  });
}
