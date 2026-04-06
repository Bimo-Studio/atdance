import { describe, expect, it } from 'vitest';

import { resolveSongPackAudioUrl, songPackChartCacheKey } from './songPackKeys';

describe('songPackKeys (Phase 2.2 — cache identity by song pack)', () => {
  it('songPackChartCacheKey matches static layout baseUrl/songId/songId.dance', () => {
    expect(songPackChartCacheKey('https://cdn.example/songs', 'synrg')).toBe(
      'https://cdn.example/songs/synrg/synrg.dance',
    );
    expect(songPackChartCacheKey('https://cdn.example/songs/', 'synrg')).toBe(
      'https://cdn.example/songs/synrg/synrg.dance',
    );
  });

  it('resolveSongPackAudioUrl joins chart directory with audio basename', () => {
    const chartUrl = 'https://cdn.example/songs/synrg/synrg.dance';
    expect(resolveSongPackAudioUrl(chartUrl, 'synrg.ogg')).toBe(
      'https://cdn.example/songs/synrg/synrg.ogg',
    );
    expect(resolveSongPackAudioUrl(chartUrl, 'sub/synrg.ogg')).toBe(
      'https://cdn.example/songs/synrg/synrg.ogg',
    );
  });

  it('resolveSongPackAudioUrl returns null when chart URL has no parent path', () => {
    expect(resolveSongPackAudioUrl('synrg.dance', 'a.ogg')).toBeNull();
  });
});
