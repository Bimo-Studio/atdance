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

  it('forwards pvpWire to peer when roomId matches sender room', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    const r2 = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' });
    s = r2.state;
    const roomId = [...s.rooms.keys()][0]!;
    const wire = {
      type: 'pvpWire' as const,
      roomId,
      body: '{"type":"pvp.v1.chartAck","chartUrl":"/x.dance"}',
    };
    const r3 = applyRelayMessage(s, 'a', wire);
    expect(sendTo(r3.effects, 'b')[0]).toEqual(wire);
    expect(sendTo(r3.effects, 'a')).toEqual([]);
  });

  it('drops pvpWire when body exceeds size limit', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    const r2 = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' });
    s = r2.state;
    const roomId = [...s.rooms.keys()][0]!;
    const huge = 'x'.repeat(9000);
    const r3 = applyRelayMessage(s, 'a', { type: 'pvpWire', roomId, body: huge });
    expect(r3.effects).toEqual([]);
  });

  it('drops pvpWire when roomId does not match sender', () => {
    let s = createRelayState();
    s = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }).state;
    const r2 = applyRelayMessage(s, 'b', { type: 'joinQueue', clientId: 'b' });
    s = r2.state;
    const r3 = applyRelayMessage(s, 'a', {
      type: 'pvpWire',
      roomId: 'room-bogus',
      body: '{}',
    });
    expect(r3.effects).toEqual([]);
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

  it('invite-only: rejects joinQueue without playerDid', () => {
    const s = createRelayState();
    const invite = { inviteOnly: true, allowedDids: new Set(['did:plc:x']) };
    const r = applyRelayMessage(s, 'a', { type: 'joinQueue', clientId: 'a' }, invite);
    expect(r.state.queue).toEqual([]);
    expect(sendTo(r.effects, 'a')[0]).toEqual({ type: 'error', code: 'invite_only' });
  });

  it('invite-only: rejects joinQueue when DID not allowlisted', () => {
    const s = createRelayState();
    const invite = { inviteOnly: true, allowedDids: new Set(['did:plc:x']) };
    const r = applyRelayMessage(
      s,
      'a',
      { type: 'joinQueue', clientId: 'a', playerDid: 'did:plc:y' },
      invite,
    );
    expect(r.state.queue).toEqual([]);
    expect(sendTo(r.effects, 'a')[0]).toEqual({ type: 'error', code: 'invite_only' });
  });

  it('invite-only: pairs when DIDs are allowlisted', () => {
    let s = createRelayState();
    const invite = { inviteOnly: true, allowedDids: new Set(['did:plc:a', 'did:plc:b']) };
    let r = applyRelayMessage(
      s,
      'a',
      { type: 'joinQueue', clientId: 'a', playerDid: 'did:plc:a' },
      invite,
    );
    s = r.state;
    expect(r.effects).toEqual([]);
    r = applyRelayMessage(
      s,
      'b',
      { type: 'joinQueue', clientId: 'b', playerDid: 'did:plc:b' },
      invite,
    );
    expect(r.state.rooms.size).toBe(1);
    expect(sendTo(r.effects, 'a').length).toBeGreaterThan(0);
    const room = [...r.state.rooms.values()][0]!;
    const roomId = room.roomId;
    expect(room.didA).toBe('did:plc:a');
    expect(room.didB).toBe('did:plc:b');
    expect(sendTo(r.effects, 'a')[0]).toEqual({
      type: 'paired',
      roomId,
      peerClientId: 'b',
      peerPlayerDid: 'did:plc:b',
    });
    expect(sendTo(r.effects, 'b')[0]).toEqual({
      type: 'paired',
      roomId,
      peerClientId: 'a',
      peerPlayerDid: 'did:plc:a',
    });
  });

  it('records optional DIDs on room when joinQueue sends playerDid', () => {
    let s = createRelayState();
    let r = applyRelayMessage(s, 'a', {
      type: 'joinQueue',
      clientId: 'a',
      playerDid: 'did:plc:alice',
    });
    s = r.state;
    r = applyRelayMessage(s, 'b', {
      type: 'joinQueue',
      clientId: 'b',
      playerDid: 'did:plc:bob',
    });
    const room = [...r.state.rooms.values()][0]!;
    expect(room.didA).toBe('did:plc:alice');
    expect(room.didB).toBe('did:plc:bob');
    const roomId = room.roomId;
    expect(sendTo(r.effects, 'a')[0]).toEqual({
      type: 'paired',
      roomId,
      peerClientId: 'b',
      peerPlayerDid: 'did:plc:bob',
    });
    expect(sendTo(r.effects, 'b')[0]).toEqual({
      type: 'paired',
      roomId,
      peerClientId: 'a',
      peerPlayerDid: 'did:plc:alice',
    });
  });
});
