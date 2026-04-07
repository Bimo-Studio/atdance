/**
 * Stable-ish remote id from hyperswarm-web `connection` details (`index.js` uses `peer.host` as map key).
 */
export function peerIdFromHyperswarmDetails(details: unknown): string {
  const d = details as { peer?: { host?: string } } | null | undefined;
  const host = d?.peer?.host;
  if (typeof host === 'string' && host.length > 0) {
    return host;
  }
  return '';
}
