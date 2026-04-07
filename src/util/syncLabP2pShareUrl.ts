/**
 * Build a URL that opens Sync Lab in P2P mode with a given topic (PRD §5.1 — shareable room key).
 */
export function syncLabP2pShareUrl(baseHref: string, topicLabel: string): string {
  const u = new URL(baseHref);
  u.searchParams.set('sync', 'p2p');
  u.searchParams.set('topic', topicLabel);
  return u.toString();
}
