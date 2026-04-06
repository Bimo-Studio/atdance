import { describe, expect, it } from 'vitest';

import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';
import { buildNoteTimeline } from '@/chart/dance/buildTimeline';
import { ParseError, parseDanceFile } from '@/chart/dance/parseDance';
import { toRealTime } from '@/chart/dance/toRealTime';

/** 120 BPM: quarter = 0.5s. Stop adds 0.5s so second arrow lands 0.5s later than without S. */
const WITH_STOP = `filename x.ogg
title T
artist A
bpm 120.0
gap 0.0
end
SINGLE
EASY 1
q 1000
S 0.5
q 0010
end
`;

const TWO_CHARTS = `filename x.ogg
title T
artist A
bpm 120.0
gap 0.0
end
SINGLE
EASY 1
q 1000
end
SINGLE
HARD 2
e 0000
end
`;

describe('toRealTime', () => {
  it('matches pydance util.toRealTime', () => {
    expect(toRealTime(120, 4)).toBeCloseTo(0.5);
    expect(toRealTime(120, 2)).toBeCloseTo(0.25);
    expect(toRealTime(160, 4 * 8.5)).toBeCloseTo((4 * 8.5 * 0.25 * 60) / 160);
  });
});

describe('parseDanceFile', () => {
  it('throws ParseError with source line when metadata has no end', () => {
    const bad = `filename x.ogg
title T
bpm 120
`;
    try {
      parseDanceFile(bad);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).line).toBe(3);
    }
  });

  it('throws ParseError with source line on invalid step row', () => {
    const bad = `filename x.ogg
title T
artist A
bpm 120.0
gap 0.0
end
SINGLE
EASY 1
q 1000
not-a-valid-step-line
end
`;
    try {
      parseDanceFile(bad);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).line).toBe(10);
    }
  });

  it('parses minimal fixture', () => {
    const { metadata, charts } = parseDanceFile(MINIMAL_DANCE_CHART);
    expect(metadata.title).toBe('Fixture');
    expect(metadata.bpm).toBe('120.0');
    expect(charts).toHaveLength(1);
    expect(charts[0]?.mode).toBe('SINGLE');
    expect(charts[0]?.difficultyName).toBe('BASIC');
    expect(charts[0]?.rows).toHaveLength(3);
  });

  it('parses multiple SINGLE sections', () => {
    const { charts } = parseDanceFile(TWO_CHARTS);
    expect(charts).toHaveLength(2);
    expect(charts[0]?.difficultyName).toBe('EASY');
    expect(charts[1]?.difficultyName).toBe('HARD');
  });
});

describe('buildNoteTimeline', () => {
  it('places the first arrow from minimal fixture like pydance Steps', () => {
    const { charts } = parseDanceFile(MINIMAL_DANCE_CHART);
    const chart = charts[0];
    if (!chart) {
      throw new Error('missing chart');
    }
    const tl = buildNoteTimeline(chart);
    expect(tl.noteEvents).toHaveLength(1);
    expect(tl.noteEvents[0]?.timeSec).toBeCloseTo(0.5);
    expect(tl.noteEvents[0]?.panels).toEqual([0, 0, 1, 0]);
  });

  it('advances song time on S (stop) rows like pydance', () => {
    const { charts } = parseDanceFile(WITH_STOP);
    const chart = charts[0];
    if (!chart) {
      throw new Error('missing chart');
    }
    const tl = buildNoteTimeline(chart);
    expect(tl.noteEvents).toHaveLength(2);
    expect(tl.noteEvents[0]?.timeSec).toBeCloseTo(0);
    expect(tl.noteEvents[1]?.timeSec).toBeCloseTo(1.0);
  });
});
