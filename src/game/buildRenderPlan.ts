import type { LaneIndex } from '@/game/types';
import type { NoteEvent } from '@/types/chart';

/** One drawable note: when it appears on screen vs when it must be hit. */
export interface RenderNote {
  readonly hitTimeSec: number;
  readonly scrollAppearanceTimeSec: number;
  readonly lane: LaneIndex;
  readonly value: number;
}

export interface RenderPlanOptions {
  readonly scrollPxPerSec: number;
  /** Hit line Y (px); notes scroll from above toward this line. */
  readonly hitLineY: number;
  /** Where new notes spawn (top of visible rail). */
  readonly spawnY: number;
}

export const DEFAULT_RENDER_OPTIONS: RenderPlanOptions = {
  scrollPxPerSec: 280,
  hitLineY: 470,
  spawnY: 80,
};

/**
 * Map chart note events to scroll/render schedule (plan Phase 1.3).
 * Lead time = (hitLineY - spawnY) / scrollPxPerSec seconds before hit.
 */
export function buildRenderPlan(
  events: readonly NoteEvent[],
  options: RenderPlanOptions,
): RenderNote[] {
  const leadSec = (options.hitLineY - options.spawnY) / options.scrollPxPerSec;
  const out: RenderNote[] = [];
  for (const ev of events) {
    ev.panels.forEach((value, lane) => {
      if (value !== 0) {
        out.push({
          hitTimeSec: ev.timeSec,
          scrollAppearanceTimeSec: ev.timeSec - leadSec,
          lane: lane as LaneIndex,
          value,
        });
      }
    });
  }
  return out.sort((a, b) => a.scrollAppearanceTimeSec - b.scrollAppearanceTimeSec);
}
