import { describe, expect, it } from 'vitest';

import { median } from '@/calibration/median';

describe('median', () => {
  it('handles odd length', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it('handles even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('empty returns 0', () => {
    expect(median([])).toBe(0);
  });
});
