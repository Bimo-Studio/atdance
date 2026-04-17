import { describe, expect, it } from 'vitest';

import {
  SIGN_IN_DJ_AUDIO,
  SIGN_IN_TEXTURE_KEYS_BY_LANE,
  pickSignInArrowTextureKey,
  signInAssetBaseUrl,
} from '@/scenes/signInRainAssets';

describe('signInRainAssets', () => {
  it('resolves base URL with trailing slash', () => {
    expect(signInAssetBaseUrl().endsWith('/')).toBe(true);
  });

  it('uses unique Phaser cache keys for DJ clips', () => {
    const set = new Set(SIGN_IN_DJ_AUDIO.map((x) => x.key));
    expect(set.size).toBe(SIGN_IN_DJ_AUDIO.length);
  });

  it('maps each lane to eight arrow texture keys (normal + spark)', () => {
    for (const lane of [0, 1, 2, 3] as const) {
      expect(SIGN_IN_TEXTURE_KEYS_BY_LANE[lane].length).toBe(8);
    }
  });

  it('pickSignInArrowTextureKey stays within lane set', () => {
    const rng = (() => {
      let i = 0;
      const seq = [0, 0.99, 0.5, 0.125];
      return () => seq[i++ % seq.length]!;
    })();
    for (const lane of [0, 1, 2, 3] as const) {
      const key = pickSignInArrowTextureKey(lane, rng);
      expect(SIGN_IN_TEXTURE_KEYS_BY_LANE[lane]).toContain(key);
    }
  });
});
