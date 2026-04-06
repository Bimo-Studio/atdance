/**
 * User-facing strings for Sync Lab WebSocket issues (plan Phase 4 gate — understandable errors).
 */

export function relayDevHint(): string {
  return 'Run `pnpm relay:dev` in another terminal (default ws://127.0.0.1:8787).';
}

export function describeWebSocketClose(code: number, reason: string): string {
  const r = reason.trim();
  const reasonSuffix = r.length > 0 ? ` (${r})` : '';

  switch (code) {
    case 1000:
      return `Connection closed normally${reasonSuffix}.`;
    case 1001:
      return `Connection going away${reasonSuffix}.`;
    case 1006:
      return `Connection closed abnormally (no close frame — relay stopped or network dropped).${reasonSuffix}`;
    case 1011:
      return `Server error${reasonSuffix}.`;
    default:
      if (code >= 4000) {
        return `Connection closed (code ${code})${reasonSuffix}.`;
      }
      return `Connection closed (code ${code})${reasonSuffix}.`;
  }
}

export function formatSyncLabUserError(
  err: unknown,
  opts: { dev: boolean; hasRelayUrl: boolean },
): string {
  const msg = err instanceof Error ? err.message : String(err);
  const hint = relayDevHint();

  if (msg === 'pong timeout') {
    return `Relay did not answer the ping in time.\n${hint}\nPress SPACE to try again.`;
  }

  const looksLikeWsFailure = msg === 'WebSocket error' || /websocket|failed to connect/i.test(msg);

  if (looksLikeWsFailure) {
    if (!opts.dev && !opts.hasRelayUrl) {
      return `Cannot reach a relay. Set VITE_RELAY_WS to your deployed Worker wss:// URL before building, or run the dev server with relay running locally.\n${hint}`;
    }
    return `Could not open WebSocket to the relay.\n${hint}\nPress SPACE to retry.`;
  }

  return `${msg}\n${hint}\nPress SPACE to retry.`;
}
