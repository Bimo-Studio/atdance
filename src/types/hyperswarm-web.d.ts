/** Community package ships without TypeScript types — minimal surface for tests and future P2P wiring. */
declare module 'hyperswarm-web' {
  export interface HyperswarmWebInstance {
    join(key: Buffer | Uint8Array | string, opts?: unknown): void;
    leave(key: Buffer | Uint8Array | string): void;
    destroy(cb?: (err?: Error) => void): void;
  }

  export default function createSwarm(opts?: Record<string, unknown>): HyperswarmWebInstance;
}
