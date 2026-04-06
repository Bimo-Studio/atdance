import { describe, expect, it } from 'vitest';

import type { DancePointsSummary } from '@/scoring/dancePoints';

import {
  buildDanceScoreRecord,
  judgmentCountsFromSummary,
  stableChartHash,
} from './buildDanceScoreRecord';

const summary: DancePointsSummary = {
  score: 42,
  arrowCount: 10,
  maxCombo: 5,
  counts: { V: 1, P: 2, G: 3, O: 1, B: 0, M: 0 },
  rank: 0.5,
  letter: 'B',
};

describe('buildDanceScoreRecord (Phase 3 — PDS payload)', () => {
  it('maps V/P into perfect and other grades into lexicon counts', () => {
    const j = judgmentCountsFromSummary(summary);
    expect(j).toEqual({ perfect: 3, great: 3, good: 1, bad: 0, miss: 0 });
  });

  it('stableChartHash is deterministic for the same play key', () => {
    expect(stableChartHash('synrg|0')).toBe(stableChartHash('synrg|0'));
    expect(stableChartHash('synrg|0')).not.toBe(stableChartHash('synrg|1'));
  });

  it('builds a parseable record', () => {
    const r = buildDanceScoreRecord({
      songId: 'synrg',
      chartHash: stableChartHash('synrg|0'),
      summary,
      clientBuild: 'atdance@test',
      playedAt: '2026-04-05T12:00:00.000Z',
    });
    expect(r.schemaVersion).toBe(1);
    expect(r.chartHash.startsWith('h:')).toBe(true);
    expect(r.grade).toBe('B');
  });
});
