type RelayEnv = Pick<ImportMetaEnv, 'VITE_RELAY_HTTP' | 'VITE_RELAY_WS'>;

/**
 * HTTPS (or http for local relay) origin for REST routes on the relay worker.
 */
export function relayHttpOriginFromEnv(env: RelayEnv): string | null {
  const explicit = env.VITE_RELAY_HTTP?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const ws = env.VITE_RELAY_WS?.trim();
  if (!ws) {
    return null;
  }
  return ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
}
