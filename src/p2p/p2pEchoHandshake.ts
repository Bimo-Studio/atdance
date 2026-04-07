import { Buffer } from 'buffer';

/**
 * Minimal duplex surface for hyperswarm-web connection streams (Node-style).
 */
export interface EchoDuplex {
  on(event: 'data', cb: (buf: Buffer) => void): void;
  once(event: 'data', cb: (buf: Buffer) => void): void;
  off(event: 'data', cb: (buf: Buffer) => void): void;
  write(chunk: Buffer | Uint8Array | string, cb?: (err?: Error) => void): boolean;
}

const PING_LINE = 'atdance-ping\n';

/**
 * One round-trip: initiator sends ping; responder echoes once; initiator receives echo.
 * Both sides resolve when their role completes.
 */
export function runEchoRoundTrip(
  socket: EchoDuplex,
  opts: { initiator: boolean; timeoutMs?: number },
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error('P2P echo timeout'));
    }, timeoutMs);

    const done = (): void => {
      globalThis.clearTimeout(timer);
      resolve();
    };

    const fail = (e: unknown): void => {
      globalThis.clearTimeout(timer);
      reject(e instanceof Error ? e : new Error(String(e)));
    };

    try {
      if (opts.initiator) {
        socket.once('data', (buf) => {
          if (buf.length === 0) {
            fail(new Error('empty echo'));
            return;
          }
          done();
        });
        socket.write(Buffer.from(PING_LINE, 'utf8'));
      } else {
        socket.once('data', (buf) => {
          socket.write(buf);
          done();
        });
      }
    } catch (e) {
      fail(e);
    }
  });
}

/** Infer WebRTC initiator from hyperswarm-web / simple-peer style details. */
export function isHyperswarmInitiator(details: unknown): boolean {
  const d = details as
    | { client?: boolean; initiator?: boolean; peer?: { host?: string } }
    | null
    | undefined;
  if (d?.client === true) {
    return true;
  }
  if (d?.client === false) {
    return false;
  }
  if (d?.initiator === true) {
    return true;
  }
  if (d?.initiator === false) {
    return false;
  }
  const host = d?.peer?.host;
  if (typeof host === 'string' && host.length > 0) {
    return host.charCodeAt(0) % 2 === 0;
  }
  return true;
}
