declare module 'timidity' {
  import type { EventEmitter } from 'events';

  export default class Timidity extends EventEmitter {
    constructor(baseUrl?: string);
    load(urlOrBuf: string | Uint8Array): Promise<void>;
    play(): void;
    pause(): void;
    destroy(): void;
  }
}
