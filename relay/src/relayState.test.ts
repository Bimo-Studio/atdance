import { describe, expect, it } from 'vitest';

import {
  applyRelayMessage,
  createRelayState,
  disconnectClient,
  type RelayEffect,
} from './relayState';

import type { SyncMessageV1 } from '../../src/sync/syncMessageV1';

function sendTo(effects: readonly RelayEffect[], clientId: string): SyncMessageV1[] {
  return effects.filter((e) => e.toClientId === clientId).map((e) => e.message);
}

describe('relay state machine (plan Phase 4.2)', () => {
  it('pairs two joinQueue clients and assigns a room id', () => {
    let s = createRelayState();
    let eff: readonly RelayEffect[] = [];

    ({ state: s, effects: eff } = applyRelayMessage(s, 'alice', {
      type: 'joinQueue',
      clientId: 'alice',
    }));
    expect(eff).toEqual([]);

    ({ state: s, effects: eff } = applyRelayMessage(s, 'bob', {
      type: 'joinQueue',
      clientId: 'bob',
    }));
    expect(s.rooms.size).toBe(1);
    expect(s.queue).toEqual([]);
    const roomId = [...s.rooms.keys()][0]!;
    expect(roomId.startsWith('room-')).toBe(true);

    const toAlice = sendTo(eff, 'alice');
    const toBob = sendTo(eff, 'bob');
    expect(toAlice[0]).toEqual({ type: 'paired', roomId, peerClientId: 'bob' });
    expect(toBob[0]).toEqual({ type: 'paired', roomId, peerClientId: 'alice' });
  });

  it('leaves a third client waiting until the next join', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    s = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' }).state;
    const r = applyRelayMessage(s, 'c', { type: 'joinQueue', clientId: 'c' });
    expect(r.state.queue).toEqual(['c']);
    expect(r.effects).toEqual([]);
  });

  it('forwards syncSample to peer in the same room', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    const r2 = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' });
    s = r2.state;
    const roomId = [...s.rooms.keys()][0]!;

    const r3 = applyRelayMessage(s, 'a', {
      type: 'syncSample',
      id: 's1',
      t: 100,
      offsetMs: 5,
    });
    expect(sendTo(r3.effects, 'b')[0]).toEqual({
      type: 'syncSample',
      id: 's1',
      t: 100,
      offsetMs: 5,
    });
    expect(sendTo(r3.effects, 'a')).toEqual([]);
    expect(r3.state.rooms.get(roomId)).toBeDefined();
  });

  it('leave removes client and notifies peer', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    const r2 = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' });
    s = r2.state;
    const roomId = [...s.rooms.keys()][0]!;

    const r3 = applyRelayMessage(s, 'a', { type: 'leave', roomId });
    expect(r3.state.rooms.size).toBe(0);
    expect(r3.state.clientRoom.has('a')).toBe(false);
    expect(r3.state.clientRoom.has('b')).toBe(false);
    const toBob = sendTo(r3.effects, 'b');
    expect(toBob.some((m) => m.type === 'leave' && m.roomId === roomId)).toBe(true);
  });

  it('disconnectClient behaves like leave for cleanup', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'x', { type: 'joinQueue', clientId: 'x' }).state;
    const r = applyRelayMessage(s, 'y', { type: 'joinQueue', clientId: 'y' });
    s = r.state;
    const roomId = [...s.rooms.keys()][0]!;
    const r2 = disconnectClient(s, 'x');
    expect(r2.state.rooms.size).toBe(0);
    expect(sendTo(r2.effects, 'y').length).toBeGreaterThan(0);
    expect(sendTo(r2.effects, 'y')[0]?.type).toBe('leave');
    expect((sendTo(r2.effects, 'y')[0] as { roomId?: string }).roomId).toBe(roomId);
  });
});
