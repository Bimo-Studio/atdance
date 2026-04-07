import { describe, expect, it } from 'vitest';

import { parsePvpMessageV1, stringifyPvpMessageV1, type PvpMessageV1 } from '@/pvp/pvpMessageV1';

describe('pvpMessageV1', () => {
  it('round-trips ping', () => {
    const m: PvpMessageV1 = { type: 'pvp.v1.ping', id: 'a', t1: 1 };
    expect(parsePvpMessageV1(stringifyPvpMessageV1(m))).toEqual(m);
  });

  it('round-trips pong', () => {
    const m: PvpMessageV1 = { type: 'pvp.v1.pong', id: 'b', t1: 1, t2: 2, t3: 3 };
    expect(parsePvpMessageV1(stringifyPvpMessageV1(m))).toEqual(m);
  });

  it('rejects unknown type prefix', () => {
    expect(parsePvpMessageV1(JSON.stringify({ type: 'sync.ping', id: 'x', t1: 1 }))).toBe(null);
  });

  it('rejects malformed JSON', () => {
    expect(parsePvpMessageV1('not json')).toBe(null);
  });

  it('rejects unknown pvp subtype', () => {
    expect(parsePvpMessageV1(JSON.stringify({ type: 'pvp.v1.unknown', id: 'x' }))).toBe(null);
  });

  it('round-trips probe and probeAck (P3.4)', () => {
    const a: PvpMessageV1 = { type: 'pvp.v1.probe', id: 'p1', t1: 1_700_000_000 };
    const b: PvpMessageV1 = { type: 'pvp.v1.probeAck', id: 'p1', t1: 1, t2: 2 };
    expect(parsePvpMessageV1(stringifyPvpMessageV1(a))).toEqual(a);
    expect(parsePvpMessageV1(stringifyPvpMessageV1(b))).toEqual(b);
  });
});
