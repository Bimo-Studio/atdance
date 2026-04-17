import type { PlaySceneData } from '@/play/playSceneData';

export interface SongSelectRow {
  label: string;
  data: PlaySceneData;
}

/** Built-in demo rows (plan Phase 2.4 — song list). */
export const SONG_SELECT_ROWS: readonly SongSelectRow[] = [
  { label: '1 — Minimal fixture (test chart)', data: { useMinimal: true } },
  {
    label: '2 — SynRG · TRICK',
    data: { chartUrl: '/songs/synrg/synrg.dance', chartIndex: 0 },
  },
  {
    label: '3 — SynRG · MANIAC',
    data: { chartUrl: '/songs/synrg/synrg.dance', chartIndex: 1 },
  },
  {
    label: '4 — 6jan2002 · TRICK',
    data: { chartUrl: '/songs/6jan2002/6jan2002.dance', chartIndex: 0 },
  },
  {
    label: '5 — 6jan2002 · MANIAC',
    data: { chartUrl: '/songs/6jan2002/6jan2002.dance', chartIndex: 1 },
  },
  {
    label: '6 — Forkbomb',
    data: { chartUrl: '/songs/forkbomb/forkbomb.dance', chartIndex: 0 },
  },
];

export function digitIndexFromKey(code: string): number | null {
  const m = /^Digit(\d)$/.exec(code);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  if (n < 1 || n > 9) {
    return null;
  }
  return n - 1;
}
