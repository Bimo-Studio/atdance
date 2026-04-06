import { describe, expect, it } from 'vitest';

import { isOffsetUnstable, offsetSampleSpreadMs } from './syncStability';

describe('syncStability (plan Phase 4.3)', () => {
  it('computes spread of offset samples', () => {
    expect(offsetSampleSpreadMs([1, 2, 3])).toBe(2);
    expect(offsetSampleSpreadMs([5])).toBe(0);
    expect(offsetSampleSpreadMs([])).toBe(0);
  });

  it('flags instability when spread exceeds threshold', () => {
    expect(isOffsetUnstable([0, 1, 0, 1], 15)).toBe(false);
    expect(isOffsetUnstable([0, 0, 0, 30], 15)).toBe(true);
  });
});
