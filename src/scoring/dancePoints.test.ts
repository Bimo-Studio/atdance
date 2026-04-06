import { describe, expect, it } from 'vitest';

import type { JudgmentGrade } from '@/judge/timeJudge';

import {
  dancePointsForJudgment,
  dancePointsIncrement,
  letterGradeFromRank,
  rankFromDancePoints,
  summarizeDancePoints,
} from './dancePoints';

describe('dancePointsIncrement (pydance DancePointsGrade)', () => {
  it('matches grades.py inc table', () => {
    expect(dancePointsIncrement('V')).toBe(2);
    expect(dancePointsIncrement('P')).toBe(2);
    expect(dancePointsIncrement('G')).toBe(1);
    expect(dancePointsIncrement('O')).toBe(0);
    expect(dancePointsIncrement('B')).toBe(-4);
    expect(dancePointsForJudgment('M')).toBe(-8);
  });
});

describe('rankFromDancePoints', () => {
  it('is 1.0 for perfect single V', () => {
    expect(rankFromDancePoints(2, 1, 0)).toBe(1);
  });

  it('is 0 when no arrows', () => {
    expect(rankFromDancePoints(0, 0, 0)).toBe(0);
  });
});

describe('letterGradeFromRank', () => {
  it('matches DancePointsGrade.grade_by_rank bands', () => {
    expect(letterGradeFromRank(1.0, false)).toBe('AAA');
    expect(letterGradeFromRank(0.93, false)).toBe('AA');
    expect(letterGradeFromRank(0.8, false)).toBe('A');
    expect(letterGradeFromRank(0.65, false)).toBe('B');
    expect(letterGradeFromRank(0.45, false)).toBe('C');
    expect(letterGradeFromRank(0.1, false)).toBe('D');
    expect(letterGradeFromRank(0.5, true)).toBe('F');
  });
});

describe('summarizeDancePoints', () => {
  it('aggregates counts and max combo (combo breaks on M)', () => {
    const grades: JudgmentGrade[] = ['V', 'P', 'M', 'G', 'G'];
    const s = summarizeDancePoints(grades, false);
    expect(s.arrowCount).toBe(5);
    expect(s.score).toBe(2 + 2 - 8 + 1 + 1);
    expect(s.counts.V).toBe(1);
    expect(s.counts.M).toBe(1);
    expect(s.maxCombo).toBe(2);
    expect(s.rank).toBe(rankFromDancePoints(s.score, s.arrowCount, 0));
  });
});
