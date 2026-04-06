import { describe, expect, it } from 'vitest';

import { emaOffsetSample, WallClockDriftTracker } from './drift';

describe('emaOffsetSample', () => {
  it('uses first sample when prev is null', () => {
    expect(emaOffsetSample(null, 0.1, 0.3)).toBe(0.1);
  });

  it('smooths toward new samples', () => {
    expect(emaOffsetSample(0, 0.1, 0.5)).toBe(0.05);
  });
});

describe('WallClockDriftTracker', () => {
  it('tracks EMA of (wallSec - audioSec)', () => {
    const t = new WallClockDriftTracker(0.5);
    expect(t.update(1.0, 0.9)).toBeCloseTo(0.1);
    expect(t.update(2.0, 1.95)).toBeCloseTo(0.5 * 0.05 + 0.5 * 0.1);
  });
});
