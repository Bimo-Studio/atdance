/** Community package ships without TypeScript types — minimal surface for tests and future P2P wiring. */
declare module 'hyperswarm-web' {
  export interface HyperswarmDuplex {
    on(event: 'data', cb: (buf: Buffer) => void): void;
    on(event: 'close' | 'end', cb: () => void): void;
    once(event: 'data', cb: (buf: Buffer) => void): void;
    once(event: 'close' | 'end', cb: () => void): void;
    off(event: 'data', cb: (buf: Buffer) => void): void;
    off(event: 'close' | 'end', cb: () => void): void;
    write(chunk: Buffer | Uint8Array | string, cb?: (err?: Error) => void): boolean;
  }

  export interface HyperswarmWebInstance {
    join(key: Buffer | Uint8Array | string, opts?: unknown): void;
    leave(key: Buffer | Uint8Array | string): void;
    destroy(cb?: (err?: Error) => void): void;
    on(event: 'connection', cb: (socket: HyperswarmDuplex, details: unknown) => void): void;
    off(event: 'connection', cb: (socket: HyperswarmDuplex, details: unknown) => void): void;
  }

  export default function createSwarm(opts?: Record<string, unknown>): HyperswarmWebInstance;
}
