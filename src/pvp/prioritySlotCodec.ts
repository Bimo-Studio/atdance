import type { PlaySceneData } from '@/play/playSceneData';

/** Encode a play configuration for storage (3 priority slots). */
export function encodePrioritySlot(data: PlaySceneData): string {
  if (data.useMinimal) {
    return 'minimal';
  }
  if (data.magnetUri !== undefined && data.magnetUri !== '') {
    return `magnet:${data.magnetUri}`;
  }
  const url = data.chartUrl ?? '';
  const idx = data.chartIndex ?? 0;
  if (url === '') {
    return '';
  }
  return `chart:${url}:${idx}`;
}

/** Decode stored slot; empty string → null (unset). */
export function decodePrioritySlot(raw: string): PlaySceneData | null {
  const s = raw.trim();
  if (s === '') {
    return null;
  }
  if (s === 'minimal') {
    return { useMinimal: true };
  }
  if (s.startsWith('magnet:')) {
    return { magnetUri: s.slice('magnet:'.length) };
  }
  if (s.startsWith('chart:')) {
    const rest = s.slice('chart:'.length);
    const lastColon = rest.lastIndexOf(':');
    if (lastColon <= 0) {
      return null;
    }
    const url = rest.slice(0, lastColon);
    const idx = Number.parseInt(rest.slice(lastColon + 1), 10);
    if (!Number.isFinite(idx) || idx < 0) {
      return null;
    }
    return { chartUrl: url, chartIndex: idx };
  }
  return null;
}
