import { describe, expect, it } from 'vitest';

import { parseSyncPingV1, parseSyncPongV1, stringifySyncPingV1 } from './syncMessage';

describe('parseSyncPingV1', () => {
  it('accepts golden JSON', () => {
    const t = '{"type":"ping","id":"abc","t1":1700000000000}';
    expect(parseSyncPingV1(t)).toEqual({ type: 'ping', id: 'abc', t1: 1700000000000 });
  });

  it('rejects wrong type', () => {
    expect(parseSyncPingV1('{"type":"pong","id":"abc","t1":1}')).toBeNull();
  });

  it('rejects invalid JSON', () => {
    expect(parseSyncPingV1('not json')).toBeNull();
  });

  it('stringifySyncPingV1 round-trips', () => {
    const p = { type: 'ping' as const, id: 'x', t1: 1.5 };
    expect(parseSyncPingV1(stringifySyncPingV1(p))).toEqual(p);
  });
});

describe('parseSyncPongV1', () => {
  it('accepts golden JSON', () => {
    const t = '{"type":"pong","id":"abc","t1":1,"t2":2,"t3":3}';
    expect(parseSyncPongV1(t)).toEqual({ type: 'pong', id: 'abc', t1: 1, t2: 2, t3: 3 });
  });

  it('rejects missing field', () => {
    expect(parseSyncPongV1('{"type":"pong","id":"abc","t1":1}')).toBeNull();
  });
});
