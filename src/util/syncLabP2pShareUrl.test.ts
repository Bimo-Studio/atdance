import { describe, expect, it } from 'vitest';

import { syncLabP2pShareUrl } from '@/util/syncLabP2pShareUrl';

describe('syncLabP2pShareUrl (PRD §5.1)', () => {
  it('sets sync=p2p and topic query', () => {
    const href = syncLabP2pShareUrl('http://127.0.0.1:5173/?e2e=1', 'my-room');
    expect(href).toContain('sync=p2p');
    expect(href).toContain('topic=my-room');
  });

  it('encodes special characters in topic', () => {
    const href = syncLabP2pShareUrl('http://x.test/play', 'a b');
    expect(new URL(href).searchParams.get('topic')).toBe('a b');
  });
});
