import type { PlaySceneData } from '@/play/playSceneData';

/**
 * Stable id for telemetry / PDS (plan Phase 2.4 — which demo was selected).
 */
export function songIdFromPlaySceneData(data: PlaySceneData): string {
  if (data.useMinimal) {
    return 'minimal';
  }
  if (data.magnetUri) {
    return 'magnet';
  }
  const url = data.chartUrl ?? '';
  const m = /\/songs\/([^/]+)\//.exec(url);
  return m?.[1] ?? 'unknown';
}
