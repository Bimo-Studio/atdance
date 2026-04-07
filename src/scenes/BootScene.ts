import Phaser from 'phaser';

import { canPlay } from '@/auth/authGate';
import { getAtprotoOAuthSession, initAtprotoSessionOnBoot } from '@/auth/atprotoSession';
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

    void initAtprotoSessionOnBoot().finally(() => {
      const session = getAtprotoOAuthSession();
      if (!canPlay(session)) {
        this.scene.start('SignInScene');
        return;
      }
      this.scene.start('TitleScene');
    });
  }
}
