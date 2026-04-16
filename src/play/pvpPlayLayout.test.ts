import { describe, expect, it } from 'vitest';

import { playfieldLayoutForWidth } from '@/play/pvpPlayLayout';

describe('playfieldLayoutForWidth', () => {
  it('returns four lane centers in ascending order', () => {
    const { laneCenters } = playfieldLayoutForWidth(800, false);
    expect(laneCenters).toHaveLength(4);
    for (let i = 1; i < laneCenters.length; i += 1) {
      expect(laneCenters[i]!).toBeGreaterThan(laneCenters[i - 1]!);
    }
  });

  it('places PvP divider and tighter playfield when opponent panel', () => {
    const solo = playfieldLayoutForWidth(800, false);
    const pvp = playfieldLayoutForWidth(800, true);
    expect(solo.splitDividerX).toBeNull();
    expect(pvp.splitDividerX).toBe(Math.floor(800 * 0.55));
    expect(pvp.playfieldRightX).toBeLessThan(solo.playfieldRightX);
    expect(pvp.laneCenters[3]!).toBeLessThanOrEqual(pvp.playfieldRightX);
  });

  it('keeps uniform lane spacing like the default template', () => {
    const { laneCenters } = playfieldLayoutForWidth(720, false);
    const g0 = laneCenters[1]! - laneCenters[0]!;
    const g1 = laneCenters[2]! - laneCenters[1]!;
    const g2 = laneCenters[3]! - laneCenters[2]!;
    expect(g0).toBeCloseTo(g1, 5);
    expect(g1).toBeCloseTo(g2, 5);
  });
});
