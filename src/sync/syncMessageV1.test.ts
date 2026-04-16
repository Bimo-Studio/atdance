import { describe, expect, it } from 'vitest';

import { parseSyncMessageV1, stringifySyncMessageV1 } from './syncMessageV1';

describe('parseSyncMessageV1 (plan Phase 4.1)', () => {
  it('parses joinQueue', () => {
    const j = '{"type":"joinQueue","clientId":"c1"}';
    expect(parseSyncMessageV1(j)).toEqual({ type: 'joinQueue', clientId: 'c1' });
  });

  it('parses joinQueue with playerDid', () => {
    const j = '{"type":"joinQueue","clientId":"c1","playerDid":"did:plc:abc"}';
    expect(parseSyncMessageV1(j)).toEqual({
      type: 'joinQueue',
      clientId: 'c1',
      playerDid: 'did:plc:abc',
    });
  });

  it('parses paired', () => {
    const j = '{"type":"paired","roomId":"r1","peerClientId":"c2"}';
    expect(parseSyncMessageV1(j)).toEqual({
      type: 'paired',
      roomId: 'r1',
      peerClientId: 'c2',
    });
  });

  it('parses paired with peerPlayerDid', () => {
    const j = '{"type":"paired","roomId":"r1","peerClientId":"c2","peerPlayerDid":"did:plc:peer"}';
    expect(parseSyncMessageV1(j)).toEqual({
      type: 'paired',
      roomId: 'r1',
      peerClientId: 'c2',
      peerPlayerDid: 'did:plc:peer',
    });
  });

  it('parses ping', () => {
    const j = '{"type":"ping","id":"abc","t1":1700000000000}';
    expect(parseSyncMessageV1(j)).toEqual({ type: 'ping', id: 'abc', t1: 1700000000000 });
  });

  it('parses pong', () => {
    const j = '{"type":"pong","id":"abc","t1":1,"t2":2,"t3":3}';
    expect(parseSyncMessageV1(j)).toEqual({ type: 'pong', id: 'abc', t1: 1, t2: 2, t3: 3 });
  });

  it('parses pvpWire', () => {
    const j =
      '{"type":"pvpWire","roomId":"r1","body":"{\\"type\\":\\"pvp.v1.ping\\",\\"id\\":\\"x\\",\\"t1\\":1}"}';
    expect(parseSyncMessageV1(j)).toEqual({
      type: 'pvpWire',
      roomId: 'r1',
      body: '{"type":"pvp.v1.ping","id":"x","t1":1}',
    });
  });

  it('parses syncSample', () => {
    const j = '{"type":"syncSample","id":"s1","t":100,"offsetMs":12.5}';
    expect(parseSyncMessageV1(j)).toEqual({
      type: 'syncSample',
      id: 's1',
      t: 100,
      offsetMs: 12.5,
    });
  });

  it('parses leave', () => {
    const j = '{"type":"leave","roomId":"r1"}';
    expect(parseSyncMessageV1(j)).toEqual({ type: 'leave', roomId: 'r1' });
  });

  it('parses relay error', () => {
    const j = '{"type":"error","code":"rate_limit"}';
    expect(parseSyncMessageV1(j)).toEqual({ type: 'error', code: 'rate_limit' });
  });

  it('rejects unknown type', () => {
    expect(parseSyncMessageV1('{"type":"nope","x":1}')).toBeNull();
  });

  it('stringifySyncMessageV1 round-trips ping', () => {
    const p = { type: 'ping' as const, id: 'x', t1: 1 };
    expect(parseSyncMessageV1(stringifySyncMessageV1(p))).toEqual(p);
  });
});
