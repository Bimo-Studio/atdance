import type { DancePointsSummary } from '@/scoring/dancePoints';

/** Passed to {@link ResultsScene} via `scene.start`. */
export interface ResultsSceneData {
  readonly songLabel: string;
  readonly summary: DancePointsSummary;
  /** Same key as `localBest` / `buildPlayKey`. */
  readonly playKey: string;
  /** Demo pack id (`synrg`, `minimal`, …). */
  readonly songId: string;
}
