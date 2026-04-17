/**
 * Browser `fetch` often throws `TypeError: Failed to fetch` for CORS/offline/wrong origin.
 * The admin UI also calls AppView for typeahead — that can work while the relay does not.
 * Use this for allowlist/relay errors so the status line is actionable, not a false "total outage".
 */
export function formatRelayAllowlistFetchError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof TypeError && msg === 'Failed to fetch') {
    return 'Could not reach the relay allowlist API. Check that the worker is running and VITE_RELAY_HTTP matches it (see .env.example).';
  }
  if (msg === 'Failed to fetch') {
    return 'Could not reach the relay allowlist API. Check that the worker is running and VITE_RELAY_HTTP matches it (see .env.example).';
  }
  return msg;
}
