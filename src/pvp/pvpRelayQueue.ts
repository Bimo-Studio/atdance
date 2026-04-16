/** Same resolution as Sync Lab (`SyncLabScene`): env, else dev default, else empty. */
export function getPvpRelayWsUrl(): string {
  const v = import.meta.env.VITE_RELAY_WS;
  if (typeof v === 'string' && v.length > 0) {
    return v;
  }
  if (import.meta.env.DEV) {
    return 'ws://127.0.0.1:8787';
  }
  return '';
}
