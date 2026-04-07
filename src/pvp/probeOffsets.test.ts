import { describe, expect, it } from 'vitest';

import { syntheticOffsetSamplesFromRttMs } from '@/pvp/probeOffsets';

describe('syntheticOffsetSamplesFromRttMs', () => {
  it('returns empty for empty input', () => {
    expect(syntheticOffsetSamplesFromRttMs([])).toEqual([]);
  });

  it('centers RTT burst around mean as half-deltas', () => {
    const o = syntheticOffsetSamplesFromRttMs([80, 100, 90]);
    expect(o.length).toBe(3);
    expect(o.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 5);
  });
});
