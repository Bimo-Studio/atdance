/**
 * Browser WebTorrent client: magnet → chart text + optional audio bytes (plan Phase 2.3).
 */
import WebTorrent from 'webtorrent';

import { readSongFromTorrentFiles, type TorrentFileLike } from '@/torrent/readTorrentSong';

function fileToLike(f: {
  name: string;
  getBuffer: (cb: (err: Error | null, buf?: Uint8Array) => void) => void;
}): TorrentFileLike {
  return {
    name: f.name,
    getBuffer: () =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        f.getBuffer((err, buf) => {
          if (err) {
            reject(err);
            return;
          }
          if (!buf) {
            reject(new Error('empty buffer'));
            return;
          }
          const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
          const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
          resolve(ab as ArrayBuffer);
        });
      }),
  };
}

export async function loadSongFromMagnetUri(
  magnetUri: string,
  timeoutMs: number,
): Promise<{ chartText: string; audioBuffer: ArrayBuffer | null }> {
  const client = new WebTorrent();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        client.destroy();
      } catch {
        /* */
      }
      reject(new Error('torrent timeout'));
    }, timeoutMs);

    try {
      client.add(magnetUri, (torrent) => {
        const run = async (): Promise<void> => {
          const files = torrent.files.map((x) => fileToLike(x));
          const out = await readSongFromTorrentFiles(files);
          clearTimeout(timer);
          try {
            client.destroy();
          } catch {
            /* */
          }
          resolve(out);
        };
        void run().catch((e: unknown) => {
          clearTimeout(timer);
          try {
            client.destroy();
          } catch {
            /* */
          }
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      });
    } catch (e) {
      clearTimeout(timer);
      try {
        client.destroy();
      } catch {
        /* */
      }
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
