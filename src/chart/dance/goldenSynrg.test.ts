/**
 * Golden snapshot for bundled demo chart (plan Phase 1.1 — optional golden tests).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildNoteTimeline } from '@/chart/dance/buildTimeline';
import { parseDanceFile } from '@/chart/dance/parseDance';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNRG_PATH = join(__dirname, '../../../public/songs/synrg/synrg.dance');

describe('golden synrg.dance (first SINGLE / TRICK)', () => {
  it('snapshot: note count and first/last hit times', () => {
    const text = readFileSync(SYNRG_PATH, 'utf8');
    const { charts } = parseDanceFile(text);
    const chart = charts[0];
    if (!chart) {
      throw new Error('expected chart 0');
    }
    const tl = buildNoteTimeline(chart);
    const ne = tl.noteEvents;
    expect({
      count: ne.length,
      firstTimeSec: ne[0]?.timeSec,
      lastTimeSec: ne[ne.length - 1]?.timeSec,
    }).toMatchSnapshot();
  });
});
