/**
 * Write `com.malldao.dance.score` to the user’s repo (plan Phase 3.3).
 */
import type { Agent } from '@atproto/api';

import { danceScoreRecordSchema, type DanceScoreRecord } from '@/lexicon/danceScoreRecord';

export const DANCE_SCORE_COLLECTION = 'com.malldao.dance.score' as const;

export async function putDanceScoreRecord(
  agent: Agent,
  record: DanceScoreRecord,
  rkey: string,
): Promise<{ uri: string; cid: string }> {
  const body = danceScoreRecordSchema.parse(record);
  const res = await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: DANCE_SCORE_COLLECTION,
    rkey,
    record: body,
    validate: true,
  });
  return { uri: res.data.uri, cid: res.data.cid };
}
