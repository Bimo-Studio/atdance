import type Phaser from 'phaser';

import { canPlay } from '@/auth/authGate';
import { skipAuthGate } from '@/auth/devAuthBypass';
import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { hasPassedInviteRelayGate } from '@/auth/inviteRelayGate';
import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

/**
 * Redirects to {@link SignInScene} when the user cannot play. Returns false if redirected.
 */
export function requirePlaySession(scene: Phaser.Scene): boolean {
  if (skipAuthGate()) {
    return true;
  }
  const session = getAtprotoOAuthSession();
  const sub = session?.sub?.trim();
  if (
    import.meta.env.VITE_INVITE_ONLY === '1' &&
    relayHttpOriginFromEnv(import.meta.env) !== null &&
    sub !== undefined &&
    sub.startsWith('did:') &&
    hasPassedInviteRelayGate(sub)
  ) {
    return true;
  }
  if (!canPlay(session)) {
    scene.scene.start('SignInScene');
    return false;
  }
  return true;
}
