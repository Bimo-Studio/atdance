import { toRealTime } from '@/chart/dance/toRealTime';
import type { ChartTimeline, NoteEvent, ParsedDanceChart } from '@/types/chart';

function sumPanels(panels: readonly number[]): number {
  return panels.reduce((a, b) => a + b, 0);
}

/**
 * Build absolute hit times (seconds) for notes from a parsed chart, matching
 * pydance `Steps` progression for SINGLE mode (no couple, no freeze/hold edge cases).
 */
export function buildNoteTimeline(chart: ParsedDanceChart): ChartTimeline {
  const bpm = Number(chart.metadata.bpm);
  const gapMs = Number(chart.metadata.gap ?? '0');
  if (Number.isNaN(bpm) || bpm <= 0) {
    throw new Error(`Invalid bpm: ${String(chart.metadata.bpm)}`);
  }
  if (Number.isNaN(gapMs)) {
    throw new Error(`Invalid gap: ${String(chart.metadata.gap)}`);
  }

  let curTime = -gapMs / 1000;
  let curBpm = bpm;
  const noteEvents: NoteEvent[] = [];

  for (const row of chart.rows) {
    switch (row.type) {
      case 'wait':
        curTime += row.seconds;
        break;
      case 'ready':
        break;
      case 'delay':
        curTime += toRealTime(curBpm, 4.0 * row.measures);
        break;
      case 'bpm':
        curBpm = row.bpm;
        break;
      case 'stop':
        // pydance: treat as time frozen for `row.seconds` (steps.py: cur_time += float(words[1]))
        curTime += row.seconds;
        break;
      case 'lyric':
        break;
      case 'note': {
        const timeToAdd = curTime;
        if (sumPanels(row.panels) !== 0) {
          noteEvents.push({ timeSec: timeToAdd, panels: [...row.panels] });
        }
        curTime += toRealTime(curBpm, row.beat);
        break;
      }
    }
  }

  return {
    metadata: chart.metadata,
    mode: chart.mode,
    difficultyName: chart.difficultyName,
    bpm,
    gapMs,
    noteEvents,
  };
}
