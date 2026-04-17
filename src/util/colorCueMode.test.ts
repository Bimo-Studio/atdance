import { describe, expect, it } from 'vitest';

import { advanceKonamiProgress, KONAMI_KEY_CODES } from '@/util/colorCueMode';

describe('advanceKonamiProgress', () => {
  it('advances on matching code', () => {
    expect(advanceKonamiProgress(0, 'ArrowUp')).toEqual({ nextIndex: 1, unlocked: false });
    expect(advanceKonamiProgress(9, 'KeyA')).toEqual({ nextIndex: 0, unlocked: true });
  });

  it('resets on mismatch but treats first key as restart of sequence', () => {
    expect(advanceKonamiProgress(3, 'KeyX')).toEqual({ nextIndex: 0, unlocked: false });
    expect(advanceKonamiProgress(3, 'ArrowUp')).toEqual({ nextIndex: 1, unlocked: false });
  });

  it('has expected Konami length', () => {
    expect(KONAMI_KEY_CODES.length).toBe(10);
  });
});
