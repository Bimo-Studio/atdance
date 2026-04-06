import { describe, expect, it } from 'vitest';

import { DEFAULT_RENDER_OPTIONS } from '@/game/buildRenderPlan';

import { buildLaneNotesFromEvents, expandNotesToLanes } from './laneNotes';

describe('buildLaneNotesFromEvents', () => {
  it('splits multi-lane rows and attaches scroll appearance lead', () => {
    const lanes = buildLaneNotesFromEvents(
      [
        { timeSec: 1, panels: [1, 0, 1, 0] },
        { timeSec: 2, panels: [0, 0, 0, 0] },
      ],
      DEFAULT_RENDER_OPTIONS,
    );
    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.lane).toBe(0);
    expect(lanes[1]?.lane).toBe(2);
    const lead =
      (DEFAULT_RENDER_OPTIONS.hitLineY - DEFAULT_RENDER_OPTIONS.spawnY) /
      DEFAULT_RENDER_OPTIONS.scrollPxPerSec;
    expect(lanes[0]?.scrollAppearanceTimeSec).toBeCloseTo(1 - lead);
  });
});

describe('expandNotesToLanes (compat)', () => {
  it('delegates to buildLaneNotesFromEvents', () => {
    const a = expandNotesToLanes([{ timeSec: 0, panels: [1, 0, 0, 0] }]);
    const b = buildLaneNotesFromEvents([{ timeSec: 0, panels: [1, 0, 0, 0] }]);
    expect(a).toEqual(b);
  });
});
