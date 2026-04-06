/**
 * Pure selection of `.dance` + audio from a torrent file list (plan Phase 2.3).
 * WebTorrent wiring calls into this with real `getBuffer` adapters.
 */

export interface TorrentFileLike {
  readonly name: string;
  readonly getBuffer: () => Promise<ArrayBuffer>;
}

export function sortTorrentFilesForSong(a: TorrentFileLike, b: TorrentFileLike): number {
  const rank = (n: string): number => {
    const l = n.toLowerCase();
    if (l.endsWith('.dance')) {
      return 0;
    }
    if (/\.(ogg|mp3|wav|flac|m4a)$/i.test(l)) {
      return 1;
    }
    return 2;
  };
  const d = rank(a.name) - rank(b.name);
  if (d !== 0) {
    return d;
  }
  return a.name.localeCompare(b.name);
}

export async function readSongFromTorrentFiles(
  files: readonly TorrentFileLike[],
): Promise<{ chartText: string; audioBuffer: ArrayBuffer | null }> {
  const sorted = [...files].sort(sortTorrentFilesForSong);
  const dance = sorted.find((f) => f.name.toLowerCase().endsWith('.dance'));
  if (!dance) {
    throw new Error('No .dance file in torrent');
  }
  const buf = await dance.getBuffer();
  const chartText = new TextDecoder('utf-8').decode(buf);
  const audioF = sorted.find((f) => /\.(ogg|mp3|wav|flac|m4a)$/i.test(f.name));
  if (!audioF) {
    return { chartText, audioBuffer: null };
  }
  const audioBuffer = await audioF.getBuffer();
  return { chartText, audioBuffer };
}
