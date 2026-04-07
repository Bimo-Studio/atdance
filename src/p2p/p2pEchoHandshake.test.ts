import { Buffer } from 'buffer';
import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import { isHyperswarmInitiator, runEchoRoundTrip, type EchoDuplex } from '@/p2p/p2pEchoHandshake';

/** Two linked duplexes: write on one emits `data` on the other (same process). */
class LinkedSocket extends EventEmitter {
  peer: LinkedSocket | null = null;

  write(chunk: Buffer | Uint8Array | string): boolean {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    queueMicrotask(() => {
      this.peer?.emit('data', buf);
    });
    return true;
  }
}

function linkedPair(): { a: EchoDuplex; b: EchoDuplex } {
  const a = new LinkedSocket();
  const b = new LinkedSocket();
  a.peer = b;
  b.peer = a;
  return { a: a as unknown as EchoDuplex, b: b as unknown as EchoDuplex };
}

describe('runEchoRoundTrip', () => {
  it('completes initiator + responder ping echo', async () => {
    const { a, b } = linkedPair();
    const pB = runEchoRoundTrip(b, { initiator: false, timeoutMs: 2000 });
    const pA = runEchoRoundTrip(a, { initiator: true, timeoutMs: 2000 });
    await Promise.all([pA, pB]);
  });
});

describe('isHyperswarmInitiator', () => {
  it('respects client flag', () => {
    expect(isHyperswarmInitiator({ client: true })).toBe(true);
    expect(isHyperswarmInitiator({ client: false })).toBe(false);
  });

  it('uses peer.host tie-break when flags missing', () => {
    expect(isHyperswarmInitiator({ peer: { host: 'A' } })).toBe(false);
    expect(isHyperswarmInitiator({ peer: { host: 'B' } })).toBe(true);
  });
});
