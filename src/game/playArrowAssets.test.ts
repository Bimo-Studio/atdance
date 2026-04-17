import { describe, expect, it } from 'vitest';

import {
  playArrowSparkTextureKey,
  playArrowTextureKey,
  playColorCueTextureKey,
} from '@/game/playArrowAssets';

describe('playArrowTextureKey', () => {
  it('maps lanes to l d u r and wraps variants0–3', () => {
    expect(playArrowTextureKey(0, 0)).toBe('play-n-l-0');
    expect(playArrowTextureKey(1, 2)).toBe('play-n-d-2');
    expect(playArrowTextureKey(2, -1)).toBe('play-n-u-3');
    expect(playArrowTextureKey(3, 99)).toBe('play-n-r-3');
  });
});

describe('playArrowSparkTextureKey', () => {
  it('uses arr_s indices 4–7', () => {
    expect(playArrowSparkTextureKey(0, 0)).toBe('play-s-l-4');
    expect(playArrowSparkTextureKey(3, 3)).toBe('play-s-r-7');
  });
});

describe('playColorCueTextureKey', () => {
  it('maps lanes and wraps arr_c variants 0–2', () => {
    expect(playColorCueTextureKey(0, 0)).toBe('play-c-l-0');
    expect(playColorCueTextureKey(2, 5)).toBe('play-c-u-2');
  });
});
