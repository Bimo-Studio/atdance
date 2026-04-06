import { danceScoreRecordSchema, type DanceScoreRecord } from '@/lexicon/danceScoreRecord';
import type { DancePointsSummary } from '@/scoring/dancePoints';

/** Map pydance-style grades (V/P/G/O/B/M) to Lexicon judgment counts. */
export function judgmentCountsFromSummary(
  summary: DancePointsSummary,
): DanceScoreRecord['judgmentCounts'] {
  return {
    perfect: summary.counts.V + summary.counts.P,
    great: summary.counts.G,
    good: summary.counts.O,
    bad: summary.counts.B,
    miss: summary.counts.M,
  };
}

/** Short, deterministic fingerprint for a chart play (no network). */
export function stableChartHash(playKey: string): string {
  let h = 5381;
  for (let i = 0; i < playKey.length; i++) {
    h = (h * 33) ^ playKey.charCodeAt(i);
  }
  return `h:${(h >>> 0).toString(16)}`;
}

export function buildDanceScoreRecord(opts: {
  songId: string;
  chartHash: string;
  summary: DancePointsSummary;
  clientBuild: string;
  playedAt: string;
}): DanceScoreRecord {
  const r: DanceScoreRecord = {
    schemaVersion: 1,
    songId: opts.songId,
    chartHash: opts.chartHash,
    score: opts.summary.score,
    grade: opts.summary.letter,
    maxCombo: opts.summary.maxCombo,
    judgmentCounts: judgmentCountsFromSummary(opts.summary),
    clientBuild: opts.clientBuild,
    playedAt: opts.playedAt,
  };
  return danceScoreRecordSchema.parse(r);
}
