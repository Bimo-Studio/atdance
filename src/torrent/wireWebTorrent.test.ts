import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';

const mockAdd = vi.fn();
const mockDestroy = vi.fn();

vi.mock('webtorrent', () => ({
  default: class WebTorrent {
    add = mockAdd;

    destroy = mockDestroy;
  },
}));

describe('loadSongFromMagnetUri', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockDestroy.mockReset();
    vi.useRealTimers();
  });

  it('resolves chart from torrent files and destroys client', async () => {
    mockAdd.mockImplementation((_magnet, onTorrent) => {
      const enc = new TextEncoder().encode(MINIMAL_DANCE_CHART);
      const fakeFile = {
        name: 'fixture.dance',
        getBuffer: (cb: (err: Error | null, buf?: Uint8Array) => void): void => {
          cb(null, enc);
        },
      };
      onTorrent({ files: [fakeFile] });
    });

    const { loadSongFromMagnetUri } = await import('./wireWebTorrent');
    const out = await loadSongFromMagnetUri('magnet:?xt=urn:btih:abc', 30_000);
    expect(out.chartText).toContain('title');
    expect(out.audioBuffer).toBeNull();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('rejects when torrent times out', async () => {
    vi.useFakeTimers();
    mockAdd.mockImplementation(() => {
      /* never invokes callback */
    });

    const { loadSongFromMagnetUri } = await import('./wireWebTorrent');
    const p = loadSongFromMagnetUri('magnet:?xt=urn:btih:dead', 100);
    const assertion = expect(p).rejects.toThrow('torrent timeout');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(mockDestroy).toHaveBeenCalled();
  });
});
