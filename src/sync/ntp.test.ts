import { describe, expect, it } from 'vitest';

import { emaAlpha, ntpOffsetMs, ntpRttMs } from './ntp';

describe('ntpOffsetMs', () => {
  it('is zero when clocks agree and delay is symmetric', () => {
    const t1 = 1000;
    const t2 = 1010;
    const t3 = 1020;
    const t4 = 1030;
    expect(ntpOffsetMs(t1, t2, t3, t4)).toBe(0);
  });

  it('matches symmetric delay with clock skew', () => {
    const t1 = 0;
    const t2 = 100;
    const t3 = 110;
    const t4 = 200;
    expect(ntpOffsetMs(t1, t2, t3, t4)).toBe(5);
  });
});

describe('ntpRttMs', () => {
  it('measures round-trip minus server processing', () => {
    const t1 = 1000;
    const t2 = 1010;
    const t3 = 1020;
    const t4 = 1030;
    expect(ntpRttMs(t1, t2, t3, t4)).toBe(20);
  });
});

describe('emaAlpha', () => {
  it('uses first sample when prev is null', () => {
    expect(emaAlpha(null, 5, 0.3)).toBe(5);
  });

  it('smooths toward new samples', () => {
    expect(emaAlpha(10, 0, 0.5)).toBe(5);
  });
});
