import type { Scene } from 'phaser';

import type { LaneIndex } from '@/game/types';

const LETTERS: readonly ['l', 'd', 'u', 'r'] = ['l', 'd', 'u', 'r'];

function keysForLane(lane: LaneIndex): readonly string[] {
  const L = LETTERS[lane];
  const n: string[] = [];
  for (let v = 0; v < 4; v++) {
    n.push(`signin-n-${L}-${v}`);
  }
  const s: string[] = [];
  for (let v = 4; v <= 7; v++) {
    s.push(`signin-s-${L}-${v}`);
  }
  return [...n, ...s] as const;
}

export const SIGN_IN_TEXTURE_KEYS_BY_LANE: Record<LaneIndex, readonly string[]> = {
  0: keysForLane(0),
  1: keysForLane(1),
  2: keysForLane(2),
  3: keysForLane(3),
};

/** Relative to `public/` (Vite serves at site root). */
const DJ_RELATIVE_PATHS = [
  'dj/djenzay/negative/awful.ogg',
  'dj/djenzay/negative/dayjob.ogg',
  'dj/djenzay/negative/everyone.ogg',
  'dj/djenzay/negative/flailing.ogg',
  'dj/djenzay/negative/programming.ogg',
  'dj/djenzay/negative/rubber.ogg',
  'dj/djenzay/negative/shameus.ogg',
  'dj/djenzay/neutral/blur.ogg',
  'dj/djenzay/neutral/moves.ogg',
  'dj/djenzay/neutral/way.ogg',
  'dj/djenzay/positive/flow.ogg',
  'dj/djenzay/positive/harder.ogg',
  'dj/djenzay/positive/respect.ogg',
  'dj/djenzay/positive/scene.ogg',
  'dj/djenzay/positive/sunshine.ogg',
  'dj/djenzay/rankings/aaa.ogg',
  'dj/djenzay/rankings/better.ogg',
  'dj/djenzay/rankings/disaster.ogg',
  'dj/djenzay/rankings/doing.ogg',
  'dj/djenzay/rankings/double.ogg',
  'dj/djenzay/rankings/effort.ogg',
  'dj/djenzay/rankings/fail.ogg',
  'dj/djenzay/rankings/flawless.ogg',
  'dj/djenzay/rankings/flawless2.ogg',
  'dj/djenzay/rankings/gettingit.ogg',
  'dj/djenzay/rankings/high.ogg',
  'dj/djenzay/rankings/impressive.ogg',
  'dj/djenzay/rankings/respectible.ogg',
  'dj/djenzay/rankings/secondchances.ogg',
  'dj/djenzay/rankings/sure.ogg',
  'dj/djenzay/rankings/tobe.ogg',
] as const;

export interface SignInDjSample {
  readonly key: string;
  readonly path: string;
}

export const SIGN_IN_DJ_AUDIO: readonly SignInDjSample[] = DJ_RELATIVE_PATHS.map((path) => ({
  key: `signin-dj-${path.replace(/\//g, '-').replace(/\.ogg$/, '')}`,
  path,
}));

export function signInAssetBaseUrl(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}

export function preloadSignInRainAssets(scene: Scene): void {
  const b = signInAssetBaseUrl();
  for (const lane of [0, 1, 2, 3] as const) {
    const L = LETTERS[lane];
    for (let v = 0; v < 4; v++) {
      scene.load.image(`signin-n-${L}-${v}`, `${b}graphics/arr_n_${L}_${v}.png`);
    }
    for (let v = 4; v <= 7; v++) {
      scene.load.image(`signin-s-${L}-${v}`, `${b}graphics/arr_s_${L}_${v}.png`);
    }
  }
  for (const { key, path } of SIGN_IN_DJ_AUDIO) {
    scene.load.audio(key, `${b}${path}`);
  }
}

export function pickSignInArrowTextureKey(lane: LaneIndex, rng: () => number): string {
  const keys = SIGN_IN_TEXTURE_KEYS_BY_LANE[lane];
  return keys[Math.floor(rng() * keys.length)]!;
}

export function playRandomSignInDjSample(scene: Scene, rng: () => number): void {
  if (SIGN_IN_DJ_AUDIO.length === 0) {
    return;
  }
  const { key } = SIGN_IN_DJ_AUDIO[Math.floor(rng() * SIGN_IN_DJ_AUDIO.length)]!;
  if (!scene.cache.audio.exists(key)) {
    return;
  }
  scene.sound.play(key, { volume: 0.52 });
}
