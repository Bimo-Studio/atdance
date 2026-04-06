/**
 * User-facing copy for Sync Lab **P2P** path (PRD §5.1 — align with syncLabErrors patterns).
 */

export type P2PSyncLabErrorCode = 'bootstrap_missing' | 'ice_failed' | 'peer_timeout';

export function formatP2PSyncLabUserError(
  code: P2PSyncLabErrorCode,
  opts: { dev: boolean },
): string {
  switch (code) {
    case 'bootstrap_missing':
      return opts.dev
        ? 'P2P bootstrap URLs are missing. Set VITE_P2P_BOOTSTRAP in .env.local (see README).'
        : 'P2P is not configured. Set VITE_P2P_BOOTSTRAP in your build environment.';
    case 'ice_failed':
      return 'WebRTC could not connect (ICE failed). Try another network or configure TURN when available.';
    case 'peer_timeout':
      return 'No peer joined this topic in time. Share the room key and try again.';
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
