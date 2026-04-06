import {
  buildRenderPlan,
  DEFAULT_RENDER_OPTIONS,
  type RenderPlanOptions,
} from '@/game/buildRenderPlan';
import type { LaneIndex } from '@/game/types';
import type { TimeGrade } from '@/judge/timeJudge';
import type { NoteEvent } from '@/types/chart';

export type { LaneIndex } from '@/game/types';

export interface LaneNote {
  readonly timeSec: number;
  /** When the note becomes visible (plan Phase 1.3 render plan). */
  readonly scrollAppearanceTimeSec: number;
  readonly lane: LaneIndex;
  /** Raw panel digit from chart (0–7). */
  readonly value: number;
  state: 'pending' | 'hit' | 'missed';
  grade?: TimeGrade;
}

/**
 * Chart IR → lane targets using {@link buildRenderPlan} (single pipeline; no duplicate expansion).
 */
export function buildLaneNotesFromEvents(
  events: readonly NoteEvent[],
  options: RenderPlanOptions = DEFAULT_RENDER_OPTIONS,
): LaneNote[] {
  const plan = buildRenderPlan(events, options);
  return plan.map((p) => ({
    timeSec: p.hitTimeSec,
    scrollAppearanceTimeSec: p.scrollAppearanceTimeSec,
    lane: p.lane,
    value: p.value,
    state: 'pending',
  }));
}

/**
 * @deprecated Use {@link buildLaneNotesFromEvents} (includes scroll spawn time).
 */
export function expandNotesToLanes(events: readonly NoteEvent[]): LaneNote[] {
  return buildLaneNotesFromEvents(events, DEFAULT_RENDER_OPTIONS);
}
