import { Buffer } from 'buffer';
import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import type { EchoDuplex } from '@/p2p/p2pEchoHandshake';
import {
  attachPongResponder,
  runNtpSampleBurstInitiator,
  runOneNtpExchangeInitiator,
  waitForSocketClose,
} from '@/p2p/p2pNtpSample';
import { emaAlpha, ntpOffsetMs, ntpRttMs } from '@/sync/ntp';

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

/**
 * P1.1 — Contract: P2P sync samples use the **same** four-timestamp NTP math as relay (`ntp.ts`).
 * Transport differs; these formulas must not be duplicated elsewhere without tests.
 */
describe('P1.1 P2P uses shared NTP math (ntp.ts)', () => {
  it('offset + RTT from one ping/pong exchange (same formulas as relay)', () => {
    const t1 = 1000;
    const t2 = 1010;
    const t3 = 1020;
    const t4 = 1030;
    expect(ntpOffsetMs(t1, t2, t3, t4)).toBe(0);
    expect(ntpRttMs(t1, t2, t3, t4)).toBe(20);
  });

  it('EMA smoothing matches Sync Lab expectations', () => {
    expect(emaAlpha(null, 12, 0.2)).toBe(12);
    expect(emaAlpha(10, 0, 0.5)).toBe(5);
  });
});

describe('P1.1 duplex JSON wire + ntp.ts (mock stream)', () => {
  it('one ping/pong over linked duplex', async () => {
    const { a, b } = linkedPair();
    const detach = attachPongResponder(b);
    const result = await runOneNtpExchangeInitiator(a, { timeoutMs: 2000 });
    detach();
    expect(Number.isFinite(result.offsetMs)).toBe(true);
    expect(Number.isFinite(result.rttMs)).toBe(true);
    expect(result.rttMs).toBeGreaterThanOrEqual(0);
  });

  it('burst initiator matches sample count', async () => {
    const { a, b } = linkedPair();
    const detach = attachPongResponder(b);
    const lines: string[] = [];
    await runNtpSampleBurstInitiator(a, {
      sampleCount: 3,
      onLine: (line) => lines.push(line),
    });
    detach();
    expect(lines.filter((l) => l.startsWith('#'))).toHaveLength(3);
  });

  it('resolves waitForSocketClose on emit(close)', async () => {
    const ee = new EventEmitter();
    const s = ee as unknown as EchoDuplex;
    const p = waitForSocketClose(s, { timeoutMs: 2000 });
    queueMicrotask(() => ee.emit('close'));
    await p;
  });
});
