import type Phaser from 'phaser';

import { canPlay } from '@/auth/authGate';
import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { isE2eMode } from '@/util/e2eFlags';

/**
 * Redirects to {@link SignInScene} when the user cannot play. Returns false if redirected.
 */
export function requirePlaySession(scene: Phaser.Scene): boolean {
  if (isE2eMode()) {
    return true;
  }
  const session = getAtprotoOAuthSession();
  if (!canPlay(session)) {
    scene.scene.start('SignInScene');
    return false;
  }
  return true;
}
