/**
 * Invite-only queue (PRD P5). Parsed from Worker env; never stores IPs.
 */
import type { RelayInviteContext } from './relayState';

export function parseRelayInviteEnv(env: {
  readonly INVITE_ONLY?: string;
  readonly ATPROTO_ALLOWLIST_DIDS?: string;
}): RelayInviteContext {
  const inviteOnly = env.INVITE_ONLY === '1';
  const raw = env.ATPROTO_ALLOWLIST_DIDS ?? '';
  const allowedDids = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return { inviteOnly, allowedDids };
}
