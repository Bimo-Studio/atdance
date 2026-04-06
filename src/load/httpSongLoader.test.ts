import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSongChartHttp, songChartUrl } from './httpSongLoader';

describe('songChartUrl', () => {
  it('builds {base}/{id}/{id}.dance', () => {
    expect(songChartUrl('https://cdn.example/songs', 'synrg')).toBe(
      'https://cdn.example/songs/synrg/synrg.dance',
    );
    expect(songChartUrl('https://cdn.example/songs/', 'forkbomb')).toBe(
      'https://cdn.example/songs/forkbomb/forkbomb.dance',
    );
  });
});

describe('fetchSongChartHttp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches chart text (Phase 2.1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'metadata block',
    });
    vi.stubGlobal('fetch', fetchMock);
    const text = await fetchSongChartHttp('https://cdn.example/songs', 'synrg');
    expect(text).toBe('metadata block');
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/songs/synrg/synrg.dance');
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSongChartHttp('https://x', 'y')).rejects.toThrow('404');
  });
});
