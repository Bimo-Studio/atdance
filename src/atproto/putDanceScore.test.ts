import type { Agent } from '@atproto/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DanceScoreRecord } from '@/lexicon/danceScoreRecord';

import { putDanceScoreRecord } from './putDanceScore';

describe('putDanceScoreRecord (plan Phase 3.3)', () => {
  const record: DanceScoreRecord = {
    schemaVersion: 1,
    songId: 'synrg',
    chartHash: 'sha256:abc',
    score: 100,
    grade: 'A',
    maxCombo: 10,
    judgmentCounts: { perfect: 10, great: 0, good: 0, bad: 0, miss: 0 },
    clientBuild: 'atdance@test',
    playedAt: '2026-04-05T12:00:00.000Z',
  };

  const putRecord = vi.fn().mockResolvedValue({
    success: true,
    headers: {},
    data: { uri: 'at://did/plc/x/com.malldao.dance.score/rkey', cid: 'bafy' },
  });

  const agent = {
    assertDid: 'did:plc:testuser',
    com: {
      atproto: {
        repo: {
          putRecord,
        },
      },
    },
  } as unknown as Agent;

  beforeEach(() => {
    putRecord.mockClear();
  });

  it('calls com.atproto.repo.putRecord with validated lexicon body', async () => {
    const out = await putDanceScoreRecord(agent, record, '3jku7wq2hf2a');
    expect(out.uri).toContain('com.malldao.dance.score');
    expect(putRecord).toHaveBeenCalledTimes(1);
    const arg = putRecord.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      repo: 'did:plc:testuser',
      collection: 'com.malldao.dance.score',
      rkey: '3jku7wq2hf2a',
      validate: true,
    });
    expect(arg?.record).toEqual(record);
  });
});
