import type { Agent } from '@atproto/api';
import { describe, expect, it, vi } from 'vitest';

import type { DanceScoreRecord } from '@/lexicon/danceScoreRecord';

import { saveScoreWithAgent } from './saveScoreToPds';

describe('saveScoreWithAgent', () => {
  it('uses a 13-char rkey and forwards to putRecord', async () => {
    const putRecord = vi.fn().mockResolvedValue({
      success: true,
      headers: {},
      data: { uri: 'at://did/com.malldao.dance.score/rkey', cid: 'bafy' },
    });
    const agent = {
      assertDid: 'did:plc:test',
      com: {
        atproto: {
          repo: { putRecord },
        },
      },
    } as unknown as Agent;

    const record: DanceScoreRecord = {
      schemaVersion: 1,
      songId: 'synrg',
      chartHash: 'h:abc',
      score: 1,
      grade: 'A',
      maxCombo: 1,
      judgmentCounts: { perfect: 1, great: 0, good: 0, bad: 0, miss: 0 },
      clientBuild: 'atdance@test',
      playedAt: '2026-04-05T12:00:00.000Z',
    };

    await saveScoreWithAgent(agent, record);
    expect(putRecord).toHaveBeenCalledTimes(1);
    const arg = putRecord.mock.calls[0]?.[0];
    expect(arg?.rkey?.length).toBe(13);
    expect(arg?.collection).toBe('com.malldao.dance.score');
  });
});
