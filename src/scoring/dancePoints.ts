/**
 * Dance Points grading from pydance `grades.py` (`DancePointsGrade`).
 * Arrow score uses inc: V/P=2, G=1, O=0, B=-4, M=-8.
 */

import type { JudgmentGrade, TimeGrade } from '@/judge/timeJudge';

const INC: Record<JudgmentGrade, number> = {
  V: 2,
  P: 2,
  G: 1,
  O: 0,
  B: -4,
  M: -8,
};

export function dancePointsIncrement(g: TimeGrade): number {
  return INC[g];
}

export function dancePointsForJudgment(g: JudgmentGrade): number {
  return INC[g];
}

/** Rank in [0,1] from raw score and arrow/hold counts (hold max contribution 6 each). */
export function rankFromDancePoints(score: number, arrowCount: number, holdCount: number): number {
  const maxScore = 2 * arrowCount + 6 * holdCount;
  if (maxScore <= 0) {
    return 0;
  }
  return score / maxScore;
}

export function letterGradeFromRank(rank: number, failed: boolean): string {
  if (failed) {
    return 'F';
  }
  if (rank >= 1.0) {
    return 'AAA';
  }
  if (rank >= 0.93) {
    return 'AA';
  }
  if (rank >= 0.8) {
    return 'A';
  }
  if (rank >= 0.65) {
    return 'B';
  }
  if (rank >= 0.45) {
    return 'C';
  }
  return 'D';
}

export interface DancePointsSummary {
  readonly score: number;
  readonly arrowCount: number;
  readonly maxCombo: number;
  readonly counts: Record<JudgmentGrade, number>;
  readonly rank: number;
  readonly letter: string;
}

export function summarizeDancePoints(
  grades: readonly JudgmentGrade[],
  failed: boolean,
): DancePointsSummary {
  const counts: Record<JudgmentGrade, number> = {
    V: 0,
    P: 0,
    G: 0,
    O: 0,
    B: 0,
    M: 0,
  };
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  for (const g of grades) {
    counts[g] += 1;
    score += dancePointsForJudgment(g);
    if (g === 'M') {
      combo = 0;
    } else {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
    }
  }
  const arrowCount = grades.length;
  const rank = rankFromDancePoints(score, arrowCount, 0);
  const letter = letterGradeFromRank(rank, failed);
  return { score, arrowCount, maxCombo, counts, rank, letter };
}
