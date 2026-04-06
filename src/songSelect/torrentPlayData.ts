import type { PlaySceneData } from '@/play/playSceneData';

/** HTTP chart/audio used when torrent fails or times out (plan Phase 2.3 / 2.4). */
export const DEFAULT_TORRENT_HTTP_FALLBACK: Pick<PlaySceneData, 'chartUrl' | 'chartIndex'> = {
  chartUrl: '/songs/synrg/synrg.dance',
  chartIndex: 0,
};

export function playDataFromMagnet(magnetUri: string, timeoutMs = 45000): PlaySceneData {
  return {
    magnetUri: magnetUri.trim(),
    torrentTimeoutMs: timeoutMs,
    ...DEFAULT_TORRENT_HTTP_FALLBACK,
  };
}
