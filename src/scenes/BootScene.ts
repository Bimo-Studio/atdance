import Phaser from 'phaser';

import { initAtprotoSessionOnBoot } from '@/auth/atprotoSession';
import { isE2eMode } from '@/util/e2eFlags';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    void initAtprotoSessionOnBoot().finally(() => {
      this.scene.start(isE2eMode() ? 'SongSelectScene' : 'TitleScene');
    });
  }
}
