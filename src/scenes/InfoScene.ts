import Phaser from 'phaser';

import { buildInfoLines } from '@/buildInfo';
import {
  advanceKonamiProgress,
  getColorCueModeEnabled,
  setColorCueModeEnabled,
} from '@/util/colorCueMode';

export interface InfoSceneData {
  /** Scene key to return to (default TitleScene). */
  backSceneKey?: string;
}

/**
 * Build / deployment fingerprint (git SHA, mode) for verifying Vercel & Cloudflare deploys and cache behavior.
 */
export class InfoScene extends Phaser.Scene {
  private backSceneKey = 'TitleScene';
  private konamiIndex = 0;

  private readonly onKonamiKeydown = (ev: KeyboardEvent): void => {
    if (ev.repeat) {
      return;
    }
    const { nextIndex, unlocked } = advanceKonamiProgress(this.konamiIndex, ev.code);
    this.konamiIndex = nextIndex;
    if (unlocked) {
      setColorCueModeEnabled(true);
      this.colorModeBanner?.setText(
        'Color note cues unlocked — scrolling arrows use primary colors. Persisted in this browser.',
      );
    }
  };

  private colorModeBanner: Phaser.GameObjects.Text | null = null;

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

    const colorHint = getColorCueModeEnabled()
      ? 'Color note cues: on (primary-color scrolling arrows in play).'
      : '';
    this.colorModeBanner = this.add
      .text(this.scale.width / 2, this.scale.height - 56, colorHint, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8fbc8f',
        align: 'center',
      })
      .setOrigin(0.5, 1);

    window.addEventListener('keydown', this.onKonamiKeydown, true);

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

    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.onKonamiKeydown, true);
    });
  }
}
