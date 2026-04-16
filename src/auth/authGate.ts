import type { OAuthSession } from '@atproto/oauth-client-browser';

import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

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

/**
 * Invite-only with a deployed relay: checks `/allowlist/v1/check` so the list can live in KV (no redeploy).
 * Falls back to {@link canPlay} when `VITE_RELAY_HTTP` / `VITE_RELAY_WS` cannot be resolved.
 */
export async function canPlayAsync(
  session: OAuthSession | null,
  env: Pick<
    ViteEnv,
    'VITE_INVITE_ONLY' | 'VITE_ATPROTO_ALLOWLIST_DIDS' | 'VITE_RELAY_WS' | 'VITE_RELAY_HTTP'
  > = import.meta.env,
): Promise<boolean> {
  const sub = session?.sub?.trim();
  if (sub === undefined || sub === '' || !sub.startsWith('did:')) {
    return false;
  }
  if (env.VITE_INVITE_ONLY !== '1') {
    return true;
  }
  const origin = relayHttpOriginFromEnv(env);
  if (origin === null) {
    return canPlay(session, env);
  }
  try {
    const r = await fetch(`${origin}/allowlist/v1/check?did=${encodeURIComponent(sub)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      return false;
    }
    const j = (await r.json()) as { allowed?: boolean };
    return j.allowed === true;
  } catch {
    return false;
  }
}
