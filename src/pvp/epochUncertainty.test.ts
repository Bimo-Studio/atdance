import { describe, expect, it } from 'vitest';

import {
  epochUncertaintyMsFromOffsets,
  maxConsecutiveOffsetDeltaMs,
  shouldUseAudioProof,
} from '@/pvp/epochUncertainty';

describe('epochUncertainty', () => {
  it('maxConsecutiveOffsetDeltaMs', () => {
    expect(maxConsecutiveOffsetDeltaMs([1, 11, 5])).toBe(10);
  });

  it('shouldUseAudioProof when spread is large', () => {
    const wide = Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 0 : 500));
    expect(shouldUseAudioProof(wide, 400)).toBe(true);
  });

  it('epochUncertaintyMsFromOffsets is finite for stable offsets', () => {
    const s = [10, 11, 10, 12, 10];
    expect(epochUncertaintyMsFromOffsets(s)).toBeLessThan(400);
  });
});
