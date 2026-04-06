/**
 * Load chart + resolve audio URL from a static HTTP song pack (plan Phase 2.1).
 * Uses IndexedDB-cached chart fetch (`fetchChartTextCached`).
 */
import { fetchChartTextCached } from '@/cache/fetchCached';
import { resolveSongPackAudioUrl } from '@/cache/songPackKeys';
import { parseDanceFile } from '@/chart/dance/parseDance';
import { songChartUrl } from '@/load/httpSongLoader';

export interface HttpSongPackResult {
  readonly chartText: string;
  readonly chartUrl: string;
  readonly audioUrl: string | null;
}

export async function loadSongPackHttp(
  baseUrl: string,
  songId: string,
): Promise<HttpSongPackResult> {
  const chartUrl = songChartUrl(baseUrl, songId);
  const chartText = await fetchChartTextCached(chartUrl);
  const { charts } = parseDanceFile(chartText);
  const chart = charts[0];
  if (!chart) {
    throw new Error('No chart in song pack');
  }
  const fn = chart.metadata.filename?.trim();
  let audioUrl: string | null = null;
  if (fn && fn.toLowerCase() !== 'dummy.ogg') {
    audioUrl = resolveSongPackAudioUrl(chartUrl, fn);
  }
  return { chartText, chartUrl, audioUrl };
}
