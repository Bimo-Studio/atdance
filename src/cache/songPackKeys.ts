/**
 * Canonical cache keys for HTTP song packs (plan Phase 2.2).
 * Chart + audio are keyed by resolved URLs passed to `fetchChartTextCached` / `decodeAudioFromUrlCached`.
 */
import { songChartUrl } from '@/load/httpSongLoader';
import { directoryOfUrl } from '@/util/url';

/** Same string used as `fetchChartTextCached` key for this pack’s chart. */
export function songPackChartCacheKey(baseUrl: string, songId: string): string {
  return songChartUrl(baseUrl, songId);
}

/**
 * Resolved audio URL next to the chart (static layout), or null if URL cannot be formed.
 */
export function resolveSongPackAudioUrl(
  chartUrl: string,
  filenameFromMetadata: string,
): string | null {
  const base = filenameFromMetadata.includes('/')
    ? filenameFromMetadata.slice(filenameFromMetadata.lastIndexOf('/') + 1)
    : filenameFromMetadata;
  const dir = directoryOfUrl(chartUrl);
  return dir ? `${dir}/${base}` : null;
}
