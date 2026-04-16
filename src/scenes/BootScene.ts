import Phaser from 'phaser';

import { canPlayAsync } from '@/auth/authGate';
import { isDevAuthBypass } from '@/auth/devAuthBypass';
import { getAtprotoOAuthSession, initAtprotoSessionOnBoot } from '@/auth/atprotoSession';
import { startInviteAllowlistWatcher } from '@/auth/inviteAllowlistWatch';
import { markInviteRelayGatePassed } from '@/auth/inviteRelayGate';
import { isE2eMode, syncLabE2eFromSearch } from '@/util/e2eFlags';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // E2E: do not block on OAuth/IndexedDB — Playwright needs scenes + #e2e-status immediately.
    if (isE2eMode()) {
      if (syncLabE2eFromSearch(window.location.search)) {
        this.scene.start('SyncLabScene');
      } else {
        this.scene.start('SongSelectScene');
      }
      void initAtprotoSessionOnBoot();
      return;
    }

    if (isDevAuthBypass()) {
      void initAtprotoSessionOnBoot().finally(() => {
        this.scene.start('TitleScene');
      });
      return;
    }

    void initAtprotoSessionOnBoot().finally(() => {
      void (async () => {
        const session = getAtprotoOAuthSession();
        if (!(await canPlayAsync(session))) {
          this.scene.start('SignInScene');
          return;
        }
        const sub = session?.sub?.trim();
        if (sub !== undefined && sub.startsWith('did:')) {
          markInviteRelayGatePassed(sub);
        }
        startInviteAllowlistWatcher();
        this.scene.start('TitleScene');
      })();
    });
  }
}
