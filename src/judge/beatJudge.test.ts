import { describe, expect, it } from 'vitest';

import { beatJudgeTickSec, isMissLateBeat, rateBeatJudge } from '@/judge/beatJudge';

describe('beatJudgeTickSec', () => {
  it('matches pydance BeatJudge._tick at 120 BPM', () => {
    const tick = beatJudgeTickSec(120);
    expect(tick).toBeCloseTo((0.16666666666666666 * 0.25 * 60) / 120);
  });
});

describe('rateBeatJudge', () => {
  it('rates near-zero offset as V at 120 BPM', () => {
    expect(rateBeatJudge(0, 1, 120)).toBe('V');
  });

  it('returns null when far outside windows', () => {
    expect(rateBeatJudge(2.0, 1, 120)).toBeNull();
  });
});

describe('isMissLateBeat', () => {
  it('flags late notes using 12 ticks in seconds', () => {
    const bpm = 120;
    const tick = beatJudgeTickSec(bpm);
    const lateAfter = 12 * tick;
    expect(isMissLateBeat(10 + lateAfter + 0.01, 10, 1, bpm)).toBe(true);
    expect(isMissLateBeat(10 + lateAfter - 0.01, 10, 1, bpm)).toBe(false);
  });
});
