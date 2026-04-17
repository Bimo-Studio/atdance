import type { Scene } from 'phaser';

import type { LaneIndex } from '@/game/types';

const LETTERS: readonly ['l', 'd', 'u', 'r'] = ['l', 'd', 'u', 'r'];

function assetBase(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}

/** Normal note / idle receptor textures (`arr_n_*`). */
export function playArrowTextureKey(lane: LaneIndex, variant: number): string {
  const L = LETTERS[lane];
  const v = ((variant % 4) + 4) % 4;
  return `play-n-${L}-${v}`;
}

/** “Held” / accent (`arr_s_*` spark set). */
export function playArrowSparkTextureKey(lane: LaneIndex, variant: number): string {
  const L = LETTERS[lane];
  const v = 4 + (((variant % 4) + 4) % 4);
  return `play-s-${L}-${v}`;
}

/** Primary-color scrolling cues (`arr_c_*`) — used when color cue mode is on (Konami). */
export function playColorCueTextureKey(lane: LaneIndex, variant: number): string {
  const L = LETTERS[lane];
  const v = ((variant % 3) + 3) % 3;
  return `play-c-${L}-${v}`;
}

export function preloadPlayArrowTextures(scene: Scene): void {
  const b = assetBase();
  for (const lane of [0, 1, 2, 3] as const) {
    const L = LETTERS[lane];
    for (let v = 0; v < 4; v++) {
      scene.load.image(`play-n-${L}-${v}`, `${b}graphics/arr_n_${L}_${v}.png`);
    }
    for (let v = 4; v <= 7; v++) {
      scene.load.image(`play-s-${L}-${v}`, `${b}graphics/arr_s_${L}_${v}.png`);
    }
    for (let v = 0; v < 3; v++) {
      scene.load.image(`play-c-${L}-${v}`, `${b}graphics/arr_c_${L}_${v}.png`);
    }
  }
}
