import Phaser from 'phaser';

import type { LaneIndex } from '@/game/types';
import { pickSignInArrowTextureKey, playRandomSignInDjSample } from '@/scenes/signInRainAssets';
import { mulberry32 } from '@/util/rngSpawn';

const RAIN_DEPTH = -400;
const BACKDROP_DEPTH = -500;
const MAX_ARROWS = 70;
const SPAWN_INTERVAL_MS = 95;
const ARROW_TARGET_HEIGHT_PX = 88;

function paintBackdrop(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  g.clear();
  g.lineStyle(1, 0x153018, 0.22);
  const step = 44;
  for (let x = 0; x <= w; x += step) {
    g.lineBetween(x, 0, x, h);
  }
  for (let y = 0; y <= h; y += step) {
    g.lineBetween(0, y, w, y);
  }
  g.lineStyle(2, 0x1f4028, 0.12);
  g.strokeRect(0, 0, w, h);
}

/**
 * Matrix-style falling arrows (PNG sprites) behind UI. OAuth strip stays DOM with higher z-index.
 */
export function attachSignInMatrixRain(scene: Phaser.Scene): () => void {
  const rng = mulberry32((Math.random() * 0xffffffff) >>> 0);
  const group = scene.add.group();
  const backdrop = scene.add.graphics();
  backdrop.setDepth(BACKDROP_DEPTH);
  paintBackdrop(backdrop, scene.scale.width, scene.scale.height);

  const spawnOne = (): void => {
    const w = scene.scale.width;
    const h = scene.scale.height;
    if (group.getLength() >= MAX_ARROWS) {
      return;
    }
    if (rng() > 0.52) {
      return;
    }

    const lane = Math.floor(rng() * 4) as LaneIndex;
    const textureKey = pickSignInArrowTextureKey(lane, rng);
    if (!scene.textures.exists(textureKey)) {
      return;
    }

    const x = 32 + rng() * (w - 64);
    const startY = -40 - rng() * 120;
    const duration = 3200 + rng() * 5200;

    const container = scene.add.container(x, startY);
    container.setDepth(RAIN_DEPTH);

    const img = scene.add.image(0, 0, textureKey);
    img.setOrigin(0.5, 0.5);
    img.setBlendMode(Phaser.BlendModes.ADD);
    const scaleMul = 0.82 + rng() * 0.38;
    const s = (ARROW_TARGET_HEIGHT_PX / img.height) * scaleMul;
    img.setScale(s);
    img.setAlpha(0.55 + rng() * 0.35);
    container.add(img);

    const hitPad = 1.2;
    const hitW = img.displayWidth * hitPad;
    const hitH = img.displayHeight * hitPad;
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    let settled = false;
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
    };

    const tw = scene.tweens.add({
      targets: container,
      y: h + 80,
      duration,
      ease: 'Linear',
      onComplete: () => {
        settle();
        group.remove(container, true, true);
      },
    });

    container.on('pointerdown', () => {
      settle();
      playRandomSignInDjSample(scene, rng);
      tw.stop();
      group.remove(container, true, true);
    });

    group.add(container);
  };

  const timer = scene.time.addEvent({
    delay: SPAWN_INTERVAL_MS,
    loop: true,
    callback: spawnOne,
  });

  return () => {
    timer.remove(false);
    group.clear(true, true);
    backdrop.destroy();
  };
}
