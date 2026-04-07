import { describe, expect, it } from 'vitest';

import { applyPairingPeer, decideSyncLabPairing } from '@/p2p/pairingFirstTwo';

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

describe('decideSyncLabPairing (Sync Lab wire)', () => {
  it('rejects empty peer id without changing state', () => {
    const empty = { phase: 'empty' as const };
    const r = decideSyncLabPairing({ state: empty, ntpStarted: false, peerId: '' });
    expect(r.kind).toBe('reject');
    if (r.kind === 'reject') {
      expect(r.reason).toBe('bad_peer_id');
      expect(r.nextState).toEqual(empty);
    }
  });

  it('accepts first peer', () => {
    const r = decideSyncLabPairing({ state: { phase: 'empty' }, ntpStarted: false, peerId: 'a' });
    expect(r.kind).toBe('accept');
    if (r.kind === 'accept') {
      expect(r.nextState).toEqual({ phase: 'one', firstPeerId: 'a' });
    }
  });

  it('rejects third peer after paired (ignored_duplicate)', () => {
    const paired = { phase: 'paired' as const, peerA: 'a', peerB: 'b' };
    const r = decideSyncLabPairing({ state: paired, ntpStarted: true, peerId: 'c' });
    expect(r.kind).toBe('reject');
    if (r.kind === 'reject') {
      expect(r.reason).toBe('ignored_duplicate');
    }
  });

  it('rejects second connection when NTP already started', () => {
    const one = { phase: 'one' as const, firstPeerId: 'a' };
    const r = decideSyncLabPairing({ state: one, ntpStarted: true, peerId: 'b' });
    expect(r.kind).toBe('reject');
    if (r.kind === 'reject') {
      expect(r.reason).toBe('ntp_already_started');
    }
  });
});
