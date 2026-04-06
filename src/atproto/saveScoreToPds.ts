import type { Agent } from '@atproto/api';

import { newAtprotoTid } from '@/atproto/atprotoTid';
import { putDanceScoreRecord } from '@/atproto/putDanceScore';
import type { DanceScoreRecord } from '@/lexicon/danceScoreRecord';

export async function saveScoreWithAgent(
  agent: Agent,
  record: DanceScoreRecord,
): Promise<{ uri: string; cid: string }> {
  const rkey = newAtprotoTid();
  return putDanceScoreRecord(agent, record, rkey);
}
