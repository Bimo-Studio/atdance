import { describe, expect, it } from 'vitest';

import {
  danceScoreRecordSchema,
  parseDanceScoreRecordJson,
  stringifyDanceScoreRecord,
} from './danceScoreRecord';

const valid = {
  schemaVersion: 1,
  songId: 'synrg',
  chartHash: 'sha256:abc123deadbeef',
  score: 982341,
  grade: 'A',
  maxCombo: 120,
  judgmentCounts: {
    perfect: 100,
    great: 20,
    good: 5,
    bad: 1,
    miss: 0,
  },
  clientBuild: 'atdance@0.0.0',
  playedAt: '2026-04-05T12:00:00.000Z',
};

describe('danceScoreRecord (Lexicon record body, plan Phase 3.1)', () => {
  it('parses and round-trips a valid record', () => {
    const parsed = danceScoreRecordSchema.parse(valid);
    expect(parsed.songId).toBe('synrg');
    const again = danceScoreRecordSchema.parse(JSON.parse(stringifyDanceScoreRecord(parsed)));
    expect(again).toEqual(parsed);
  });

  it('parseDanceScoreRecordJson accepts JSON string', () => {
    const r = parseDanceScoreRecordJson(JSON.stringify(valid));
    expect(r.songId).toBe('synrg');
  });

  it('rejects missing required field', () => {
    const { songId: _s, ...rest } = valid;
    expect(() => danceScoreRecordSchema.parse(rest)).toThrow();
  });

  it('rejects negative judgment count', () => {
    expect(() =>
      danceScoreRecordSchema.parse({
        ...valid,
        judgmentCounts: { ...valid.judgmentCounts, perfect: -1 },
      }),
    ).toThrow();
  });

  it('accepts optional replayUri', () => {
    const withReplay = { ...valid, replayUri: 'https://example.com/replays/1' };
    const r = danceScoreRecordSchema.parse(withReplay);
    expect(r.replayUri).toBe('https://example.com/replays/1');
  });
});
