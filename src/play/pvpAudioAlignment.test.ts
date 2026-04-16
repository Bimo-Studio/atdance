import { describe, expect, it } from 'vitest';

import { msUntilWallUnixMs, pvpSongTimeAlignment } from './pvpAudioAlignment';

describe('pvpSongTimeAlignment', () => {
  it('uses zero offset when wall is before agreed start', () => {
    const r = pvpSongTimeAlignment(1000, 900, 5);
    expect(r.bufferOffsetSec).toBe(0);
    expect(r.audioStartSec).toBe(5);
  });

  it('seeks buffer when wall is after agreed start', () => {
    const r = pvpSongTimeAlignment(1000, 2500, 10);
    expect(r.bufferOffsetSec).toBe(1.5);
    expect(r.audioStartSec).toBe(8.5);
  });
});

describe('msUntilWallUnixMs', () => {
  it('returns 0 when past target', () => {
    expect(msUntilWallUnixMs(100, 200)).toBe(0);
  });

  it('returns positive delay until target', () => {
    expect(msUntilWallUnixMs(250, 50)).toBe(200);
  });
});
