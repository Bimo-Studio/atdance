/**
 * Lexicon record body: `com.malldao.dance.score` (plan Phase 3.1).
 * Validates JSON for `com.atproto.repo.putRecord` writes to self-hosted PDS.
 */
import { z } from 'zod';

export const judgmentCountsSchema = z.object({
  perfect: z.number().int().nonnegative(),
  great: z.number().int().nonnegative(),
  good: z.number().int().nonnegative(),
  bad: z.number().int().nonnegative(),
  miss: z.number().int().nonnegative(),
});

export const danceScoreRecordSchema = z.object({
  /** Bump when fields change (ATProto lexicon revisions). */
  schemaVersion: z.number().int().positive(),
  songId: z.string().min(1).max(256),
  chartHash: z.string().min(1).max(128),
  score: z.number().finite(),
  grade: z.string().min(1).max(16),
  maxCombo: z.number().int().nonnegative(),
  judgmentCounts: judgmentCountsSchema,
  clientBuild: z.string().max(128),
  playedAt: z.iso.datetime(),
  replayUri: z.url().optional(),
});

export type DanceScoreRecord = z.infer<typeof danceScoreRecordSchema>;

export function parseDanceScoreRecordJson(text: string): DanceScoreRecord {
  const j = JSON.parse(text) as unknown;
  return danceScoreRecordSchema.parse(j);
}

export function stringifyDanceScoreRecord(r: DanceScoreRecord): string {
  return JSON.stringify(r);
}
