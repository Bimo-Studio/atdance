import { describe, expect, it } from 'vitest';

import { encodeSyncWireLine, feedSyncWireBuffer } from '@/p2p/syncWire';

describe('P1.1 syncWire (duplex JSON lines)', () => {
  it('round-trips ping through encode + feed buffer', () => {
    const ping = {
      type: 'ping' as const,
      id: 'a1',
      t1: 42,
    };
    const line = encodeSyncWireLine(ping);
    const { buffer, messages } = feedSyncWireBuffer('', line);
    expect(buffer).toBe('');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(ping);
  });

  it('handles chunked input across ping + pong', () => {
    const ping = encodeSyncWireLine({
      type: 'ping',
      id: 'x',
      t1: 1,
    });
    const pong = encodeSyncWireLine({
      type: 'pong',
      id: 'x',
      t1: 1,
      t2: 2,
      t3: 3,
    });
    const half = ping.slice(0, 5);
    const rest1 = ping.slice(5) + pong;
    let acc = '';
    let all: ReturnType<typeof feedSyncWireBuffer>['messages'] = [];
    const r1 = feedSyncWireBuffer(acc, half);
    acc = r1.buffer;
    all = all.concat(r1.messages);
    const r2 = feedSyncWireBuffer(acc, rest1);
    acc = r2.buffer;
    all = all.concat(r2.messages);
    expect(all).toHaveLength(2);
    expect(all[0]?.type).toBe('ping');
    expect(all[1]?.type).toBe('pong');
    expect(acc).toBe('');
  });

  it('P0.3 / P1.1 — echo semantics: same bytes return as one parsed message', () => {
    const msg = {
      type: 'syncSample' as const,
      id: 's1',
      t: 999,
      offsetMs: 1.5,
    };
    const wire = encodeSyncWireLine(msg);
    const echoed = wire;
    const { messages } = feedSyncWireBuffer('', echoed);
    expect(messages[0]).toEqual(msg);
  });
});
