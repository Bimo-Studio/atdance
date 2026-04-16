import Phaser from 'phaser';

import { buildInfoLines } from '@/buildInfo';

export interface InfoSceneData {
  /** Scene key to return to (default TitleScene). */
  backSceneKey?: string;
}

/**
 * Build / deployment fingerprint (git SHA, mode) for verifying Vercel & Cloudflare deploys and cache behavior.
 */
export class InfoScene extends Phaser.Scene {
  private backSceneKey = 'TitleScene';

  constructor() {
    super({ key: 'InfoScene' });
  }

  init(data: InfoSceneData): void {
    this.backSceneKey = data?.backSceneKey ?? 'TitleScene';
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, 48, 'Build info', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    const lines = [
      'Use this to confirm the bundle matches the deploy and that the browser is not serving a stale cache.',
      '',
      ...buildInfoLines(),
      '',
      'View page source: HTML comment (flowerbox) right under <!DOCTYPE> lists the same git SHA.',
      '',
      'ESC or click — back',
    ];

    this.add
      .text(this.scale.width / 2, 120, lines.join('\n'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#aabbcc',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    const goBack = (): void => {
      this.scene.start(this.backSceneKey);
    };
    this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) {
        return;
      }
      goBack();
    });
    this.input.keyboard?.once('keydown-ESC', goBack);
  }
}
