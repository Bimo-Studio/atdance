import { describe, expect, it } from 'vitest';

import { applyPairingPeer } from '@/p2p/pairingFirstTwo';

describe('P2.1 applyPairingPeer (first-two peers)', () => {
  it('empty → one peer → waiting', () => {
    const a = applyPairingPeer({ phase: 'empty' }, 'alice');
    expect(a.event).toBe('waiting');
    expect(a.next).toEqual({ phase: 'one', firstPeerId: 'alice' });
  });

  it('duplicate id before second peer stays waiting', () => {
    const s = applyPairingPeer({ phase: 'empty' }, 'alice').next;
    const b = applyPairingPeer(s, 'alice');
    expect(b.event).toBe('waiting');
    expect(b.next).toEqual({ phase: 'one', firstPeerId: 'alice' });
  });

  it('second distinct peer → paired with deterministic order', () => {
    const s = applyPairingPeer({ phase: 'empty' }, 'alice').next;
    const c = applyPairingPeer(s, 'bob');
    expect(c.event).toBe('paired');
    expect(c.next).toEqual({ phase: 'paired', peerA: 'alice', peerB: 'bob' });
  });

  it('third peer after paired is ignored', () => {
    const paired = { phase: 'paired' as const, peerA: 'alice', peerB: 'bob' };
    const d = applyPairingPeer(paired, 'carol');
    expect(d.event).toBe('ignored_duplicate');
    expect(d.next).toEqual(paired);
  });
});
