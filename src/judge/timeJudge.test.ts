import { describe, expect, it } from 'vitest';

import { isMissLate, okWindowSec, rateTimeJudge } from '@/judge/timeJudge';

describe('rateTimeJudge', () => {
  it('matches pydance TimeJudge tiers at scale 1', () => {
    expect(rateTimeJudge(0, 1)).toBe('V');
    expect(rateTimeJudge(0.022, 1)).toBe('V');
    expect(rateTimeJudge(0.023, 1)).toBe('P');
    expect(rateTimeJudge(0.044, 1)).toBe('P');
    expect(rateTimeJudge(0.046, 1)).toBe('G');
    expect(rateTimeJudge(0.089, 1)).toBe('G');
    expect(rateTimeJudge(0.091, 1)).toBe('O');
    expect(rateTimeJudge(0.134, 1)).toBe('O');
    expect(rateTimeJudge(0.136, 1)).toBe('B');
    expect(rateTimeJudge(0.179, 1)).toBe('B');
    expect(rateTimeJudge(0.181, 1)).toBeNull();
    expect(rateTimeJudge(-0.02, 1)).toBe('V');
  });

  it('scales windows with judgescale', () => {
    expect(rateTimeJudge(0.044, 2)).toBe('V');
    expect(rateTimeJudge(0.045, 2)).toBe('P');
  });
});

describe('isMissLate', () => {
  it('misses when past B window after note time', () => {
    expect(isMissLate(5.0 + 0.181, 5.0, 1)).toBe(true);
    expect(isMissLate(5.0 + 0.179, 5.0, 1)).toBe(false);
  });
});

describe('okWindowSec', () => {
  it('exports pydance ok_time at scale 1', () => {
    expect(okWindowSec(1)).toBeCloseTo(0.25);
  });
});
