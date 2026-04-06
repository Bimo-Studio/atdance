import { describe, expect, it } from 'vitest';

import { emaAlpha, ntpOffsetMs, ntpRttMs } from '@/sync/ntp';

/**
 * P1.1 — Contract: P2P sync samples use the **same** four-timestamp NTP math as relay (`ntp.ts`).
 * Transport differs; these formulas must not be duplicated elsewhere without tests.
 */
describe('P1.1 P2P uses shared NTP math (ntp.ts)', () => {
  it('offset + RTT from one ping/pong exchange (same formulas as relay)', () => {
    const t1 = 1000;
    const t2 = 1010;
    const t3 = 1020;
    const t4 = 1030;
    expect(ntpOffsetMs(t1, t2, t3, t4)).toBe(0);
    expect(ntpRttMs(t1, t2, t3, t4)).toBe(20);
  });

  it('EMA smoothing matches Sync Lab expectations', () => {
    expect(emaAlpha(null, 12, 0.2)).toBe(12);
    expect(emaAlpha(10, 0, 0.5)).toBe(5);
  });
});
