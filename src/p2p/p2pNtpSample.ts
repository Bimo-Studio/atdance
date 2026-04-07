import { Buffer } from 'buffer';

import type { EchoDuplex } from '@/p2p/p2pEchoHandshake';
import { encodeSyncWireLine, feedSyncWireBuffer } from '@/p2p/syncWire';
import { emaAlpha, ntpOffsetMs, ntpRttMs } from '@/sync/ntp';
import { isOffsetUnstable } from '@/sync/syncStability';

/**
 * Responder: parse JSON lines, reply to each `ping` with `pong` (t2/t3 = wall clock).
 * Returns detach — call when the socket is done (e.g. after `close`).
 */
export function attachPongResponder(socket: EchoDuplex): () => void {
  let wireBuf = '';
  const onData = (buf: Buffer): void => {
    const r = feedSyncWireBuffer(wireBuf, buf.toString('utf8'));
    wireBuf = r.buffer;
    for (const m of r.messages) {
      if (m.type === 'ping') {
        const t2 = Date.now();
        const t3 = Date.now();
        socket.write(
          Buffer.from(
            encodeSyncWireLine({
              type: 'pong',
              id: m.id,
              t1: m.t1,
              t2,
              t3,
            }),
            'utf8',
          ),
        );
      }
    }
  };
  socket.on('data', onData);
  return () => {
    socket.off('data', onData);
  };
}

/**
 * Initiator: one NTP-style ping/pong over the JSON-line wire (same math as relay — `ntp.ts`).
 */
export async function runOneNtpExchangeInitiator(
  socket: EchoDuplex,
  opts: { timeoutMs?: number } = {},
): Promise<{ offsetMs: number; rttMs: number }> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  await new Promise<void>((r) => queueMicrotask(() => r()));

  let wireBuf = '';
  const id = globalThis.crypto.randomUUID();
  const t1 = Date.now();
  socket.write(Buffer.from(encodeSyncWireLine({ type: 'ping', id, t1 }), 'utf8'));

  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      socket.off('data', onData);
      reject(new Error('P2P pong timeout'));
    }, timeoutMs);

    const onData = (buf: Buffer): void => {
      const r = feedSyncWireBuffer(wireBuf, buf.toString('utf8'));
      wireBuf = r.buffer;
      for (const m of r.messages) {
        if (m.type === 'pong' && m.id === id) {
          globalThis.clearTimeout(timer);
          socket.off('data', onData);
          const t4 = Date.now();
          if (m.t1 !== t1) {
            reject(new Error('P2P pong t1 mismatch'));
            return;
          }
          resolve({
            offsetMs: ntpOffsetMs(t1, m.t2, m.t3, t4),
            rttMs: ntpRttMs(t1, m.t2, m.t3, t4),
          });
          return;
        }
      }
    };

    socket.on('data', onData);
  });
}

export async function runNtpSampleBurstInitiator(
  socket: EchoDuplex,
  opts: {
    sampleCount?: number;
    alpha?: number;
    pingTimeoutMs?: number;
    onLine?: (line: string) => void;
  } = {},
): Promise<void> {
  const sampleCount = opts.sampleCount ?? 10;
  const alpha = opts.alpha ?? 0.35;
  const pingTimeoutMs = opts.pingTimeoutMs ?? 5000;
  let ema: number | null = null;
  const offsets: number[] = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const { offsetMs, rttMs } = await runOneNtpExchangeInitiator(socket, {
      timeoutMs: pingTimeoutMs,
    });
    offsets.push(offsetMs);
    ema = emaAlpha(ema, offsetMs, alpha);
    const emaStr = ema === null ? '—' : ema.toFixed(1);
    opts.onLine?.(
      `#${i + 1}  offset ${offsetMs.toFixed(1)} ms  RTT ${rttMs.toFixed(1)} ms  EMA ${emaStr} ms`,
    );
    if (isOffsetUnstable(offsets, 15)) {
      opts.onLine?.('(sample spread > 15 ms — unstable)');
    }
  }
}

/** Wait for a Node-style duplex `close` or `end` (hyperswarm / simple-peer streams). */
export function waitForSocketClose(
  socket: EchoDuplex,
  opts: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  return new Promise((resolve, reject) => {
    const s = socket as EchoDuplex & {
      once?(e: 'close' | 'end', cb: () => void): void;
      off?(e: 'close' | 'end', cb: () => void): void;
    };

    if (typeof s.once !== 'function') {
      reject(new Error('P2P socket does not support close/end events'));
      return;
    }

    let settled = false;
    const timer = globalThis.setTimeout(() => {
      teardown();
      if (!settled) {
        settled = true;
        reject(new Error('P2P socket close timeout'));
      }
    }, timeoutMs);

    const onClose = (): void => finish();
    const onEnd = (): void => finish();

    function teardown(): void {
      globalThis.clearTimeout(timer);
      if (typeof s.off === 'function') {
        s.off('close', onClose);
        s.off('end', onEnd);
      }
    }

    function finish(): void {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timer);
      if (typeof s.off === 'function') {
        s.off('close', onClose);
        s.off('end', onEnd);
      }
      resolve();
    }

    s.once('close', onClose);
    s.once('end', onEnd);
  });
}
