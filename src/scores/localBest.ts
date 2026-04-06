import { get, set } from 'idb-keyval';

import type { PlaySceneData } from '@/play/playSceneData';

const PREFIX = 'atdance.localBest.v1';

function keyFor(playKey: string): string {
  return `${PREFIX}:${playKey}`;
}

/** Stable id for a chart play (minimal vs URL + difficulty index). */
export function buildPlayKey(data: PlaySceneData, chartIndex: number): string {
  if (data.useMinimal) {
    return 'minimal';
  }
  return `${data.chartUrl ?? ''}|${chartIndex}`;
}

export function computeBestUpdate(
  prev: number | undefined,
  candidate: number,
): { best: number; changed: boolean } {
  const p = prev ?? 0;
  if (candidate > p) {
    return { best: candidate, changed: true };
  }
  return { best: p, changed: false };
}

export async function getLocalBest(playKey: string): Promise<number | undefined> {
  return get<number>(keyFor(playKey));
}

/** Persists if `score` beats the stored best; returns the best value to display. */
export async function saveLocalBestIfBetter(playKey: string, score: number): Promise<number> {
  const prev = await getLocalBest(playKey);
  const { best, changed } = computeBestUpdate(prev, score);
  if (changed) {
    await set(keyFor(playKey), best);
  }
  return best;
}
