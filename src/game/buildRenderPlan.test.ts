import { describe, expect, it } from 'vitest';

import type { NoteEvent } from '@/types/chart';

import { buildRenderPlan, DEFAULT_RENDER_OPTIONS } from './buildRenderPlan';

describe('buildRenderPlan', () => {
  it('sets scrollAppearanceTime before hitTime by pixels/scroll speed', () => {
    const notes: NoteEvent[] = [{ timeSec: 5, panels: [1, 0, 0, 0] }];
    const plan = buildRenderPlan(notes, DEFAULT_RENDER_OPTIONS);
    expect(plan).toHaveLength(1);
    const ev = plan[0];
    if (!ev) {
      throw new Error('expected event');
    }
    expect(ev.hitTimeSec).toBe(5);
    const pixels = DEFAULT_RENDER_OPTIONS.hitLineY - DEFAULT_RENDER_OPTIONS.spawnY;
    const lead = pixels / DEFAULT_RENDER_OPTIONS.scrollPxPerSec;
    expect(ev.scrollAppearanceTimeSec).toBeCloseTo(5 - lead);
  });

  it('expands multiple panels into one render row each', () => {
    const notes: NoteEvent[] = [{ timeSec: 1, panels: [1, 1, 0, 0] }];
    const plan = buildRenderPlan(notes, DEFAULT_RENDER_OPTIONS);
    expect(plan).toHaveLength(2);
  });
});
