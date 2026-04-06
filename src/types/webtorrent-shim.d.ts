/** Minimal surface for WebTorrent browser client (no upstream .d.ts in package). */
declare module 'webtorrent' {
  interface TorrentFile {
    readonly name: string;
    getBuffer(cb: (err: Error | null, buf?: Uint8Array) => void): void;
  }

  interface Torrent {
    readonly files: readonly TorrentFile[];
  }

  export default class WebTorrent {
    constructor();
    add(magnetUri: string, onTorrent: (torrent: Torrent) => void): void;
    destroy(): void;
  }
}
