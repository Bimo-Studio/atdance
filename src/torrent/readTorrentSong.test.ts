import { describe, expect, it } from 'vitest';

import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';

import { readSongFromTorrentFiles, sortTorrentFilesForSong } from './readTorrentSong';

describe('sortTorrentFilesForSong', () => {
  it('prioritizes .dance then audio extensions', () => {
    const a = { name: 'z.ogg', getBuffer: async () => new ArrayBuffer(0) };
    const b = { name: 'a.dance', getBuffer: async () => new ArrayBuffer(0) };
    const c = { name: 'readme.txt', getBuffer: async () => new ArrayBuffer(0) };
    const s = [a, b, c].sort(sortTorrentFilesForSong);
    expect(s[0]?.name).toBe('a.dance');
    expect(s[1]?.name).toBe('z.ogg');
  });
});

describe('readSongFromTorrentFiles', () => {
  it('reads chart text and audio buffer in priority order', async () => {
    const enc = new TextEncoder();
    const r = await readSongFromTorrentFiles([
      { name: 'x.bin', getBuffer: async () => new ArrayBuffer(1) },
      {
        name: 'song.dance',
        getBuffer: async () => enc.encode(MINIMAL_DANCE_CHART).buffer,
      },
      { name: 'a.ogg', getBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
    ]);
    expect(r.chartText).toContain('SINGLE');
    expect(r.audioBuffer).not.toBeNull();
    expect(new Uint8Array(r.audioBuffer!).length).toBe(3);
  });

  it('throws without .dance', async () => {
    await expect(
      readSongFromTorrentFiles([{ name: 'a.ogg', getBuffer: async () => new ArrayBuffer(0) }]),
    ).rejects.toThrow(/No \.dance/);
  });
});
