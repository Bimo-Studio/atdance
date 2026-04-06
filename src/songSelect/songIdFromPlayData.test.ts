import { describe, expect, it } from 'vitest';

import { SONG_SELECT_ROWS } from './songSelectRows';
import { songIdFromPlaySceneData } from './songIdFromPlayData';

describe('songIdFromPlaySceneData (plan Phase 2.4 — loader identity)', () => {
  it('maps each built-in HTTP row to the expected song pack id', () => {
    expect(songIdFromPlaySceneData(SONG_SELECT_ROWS[0]!.data)).toBe('minimal');
    expect(songIdFromPlaySceneData(SONG_SELECT_ROWS[1]!.data)).toBe('synrg');
    expect(songIdFromPlaySceneData(SONG_SELECT_ROWS[3]!.data)).toBe('6jan');
    expect(songIdFromPlaySceneData(SONG_SELECT_ROWS[5]!.data)).toBe('forkbomb');
  });

  it('reflects chartIndex for multi-chart files', () => {
    expect(SONG_SELECT_ROWS[1]!.data.chartIndex).toBe(0);
    expect(SONG_SELECT_ROWS[2]!.data.chartIndex).toBe(1);
  });
});
