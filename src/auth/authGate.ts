import type { OAuthSession } from '@atproto/oauth-client-browser';

type ViteEnv = ImportMetaEnv;

/**
 * Whether the user may access gameplay (song select, PvP, play). Requires a valid ATProto session.
 * When `VITE_INVITE_ONLY=1`, `VITE_ATPROTO_ALLOWLIST_DIDS` must contain the session DID (comma-separated).
 */
export function canPlay(
  session: OAuthSession | null,
  env: Pick<ViteEnv, 'VITE_INVITE_ONLY' | 'VITE_ATPROTO_ALLOWLIST_DIDS'> = import.meta.env,
): boolean {
  const sub = session?.sub?.trim();
  if (sub === undefined || sub === '' || !sub.startsWith('did:')) {
    return false;
  }
  if (env.VITE_INVITE_ONLY === '1') {
    const raw = env.VITE_ATPROTO_ALLOWLIST_DIDS ?? '';
    const allowed = new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    return allowed.has(sub);
  }
  return true;
}
