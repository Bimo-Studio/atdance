/**
 * Sync Lab transport: legacy relay WebSocket vs P2P spike (`?sync=p2p` or `VITE_SYNC_LAB_MODE=p2p`).
 */

export function topicLabelFromSearch(search: string): string {
  const t = new URLSearchParams(search).get('topic')?.trim();
  return t && t.length > 0 ? t : 'atdance-sync-lab';
}

export function syncLabTransportMode(): 'relay' | 'p2p' {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('sync') === 'p2p') {
      return 'p2p';
    }
  }
  return import.meta.env.VITE_SYNC_LAB_MODE === 'p2p' ? 'p2p' : 'relay';
}

export function syncLabP2pTopicLabel(): string {
  if (typeof window === 'undefined') {
    return 'atdance-sync-lab';
  }
  return topicLabelFromSearch(window.location.search);
}
