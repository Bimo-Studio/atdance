import { describe, expect, it } from 'vitest';

import { parseSyncPingPayload } from './protocol';

describe('parseSyncPingPayload', () => {
  it('parses valid ping JSON', () => {
    expect(parseSyncPingPayload('{"type":"ping","id":"x","t1":1700000000000}')).toEqual({
      id: 'x',
      t1: 1700000000000,
    });
  });

  it('returns null for pong or invalid type', () => {
    expect(parseSyncPingPayload('{"type":"pong","id":"x","t1":1,"t2":2,"t3":3}')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseSyncPingPayload('not json')).toBeNull();
  });
});
