import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';

import { loadSongPackHttp } from './loadSongPackHttp';

vi.mock('@/cache/fetchCached', () => ({
  fetchChartTextCached: vi.fn(),
}));

import { fetchChartTextCached } from '@/cache/fetchCached';

describe('loadSongPackHttp', () => {
  beforeEach(() => {
    vi.mocked(fetchChartTextCached).mockReset();
  });

  it('returns chart text and audio URL from first chart metadata', async () => {
    const chart = `filename synrg.ogg
title T
artist A
bpm 120
gap 0
end
SINGLE
EASY 1
q 1000
end
`;
    vi.mocked(fetchChartTextCached).mockResolvedValue(chart);
    const r = await loadSongPackHttp('https://cdn.example/songs', 'synrg');
    expect(r.chartText).toBe(chart);
    expect(r.chartUrl).toBe('https://cdn.example/songs/synrg/synrg.dance');
    expect(r.audioUrl).toBe('https://cdn.example/songs/synrg/synrg.ogg');
    expect(fetchChartTextCached).toHaveBeenCalledWith(
      'https://cdn.example/songs/synrg/synrg.dance',
    );
  });

  it('yields null audio for dummy placeholder', async () => {
    vi.mocked(fetchChartTextCached).mockResolvedValue(MINIMAL_DANCE_CHART);
    const r = await loadSongPackHttp('https://example.com/songs', 'fixture');
    expect(r.audioUrl).toBeNull();
  });
});
