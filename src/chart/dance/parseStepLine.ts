import { DANCE_BEATS, isBeatToken } from '@/chart/dance/beats';
import type { DanceStepRow } from '@/types/chart';

function parsePanels(panelStr: string): number[] {
  if (panelStr.length === 0) {
    throw new Error('Missing panel digits');
  }
  return [...panelStr].map((ch) => {
    const n = Number.parseInt(ch, 10);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid panel character: ${ch}`);
    }
    return n;
  });
}

/**
 * Parse one non-empty step line from a .dance chart (SINGLE / non-couple).
 */
export function parseStepLine(line: string): DanceStepRow {
  const parts = line
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new Error('Empty step line');
  }

  const head = parts[0];
  if (head === undefined) {
    throw new Error('Empty step line');
  }

  if (head === 'W') {
    const sec = Number(parts[1]);
    if (parts.length < 2 || Number.isNaN(sec)) {
      throw new Error(`Invalid W line: ${line}`);
    }
    return { type: 'wait', seconds: sec };
  }
  if (head === 'R') {
    return { type: 'ready' };
  }
  if (head === 'D') {
    const m = Number(parts[1]);
    if (parts.length < 2 || Number.isNaN(m)) {
      throw new Error(`Invalid D line: ${line}`);
    }
    return { type: 'delay', measures: m };
  }
  if (head === 'B') {
    const bpm = Number(parts[1]);
    if (parts.length < 2 || Number.isNaN(bpm)) {
      throw new Error(`Invalid B line: ${line}`);
    }
    return { type: 'bpm', bpm };
  }
  if (head === 'S') {
    const sec = Number(parts[1]);
    if (parts.length < 2 || Number.isNaN(sec)) {
      throw new Error(`Invalid S line: ${line}`);
    }
    return { type: 'stop', seconds: sec };
  }
  if (isBeatToken(head)) {
    const beat = DANCE_BEATS[head];
    if (beat === undefined) {
      throw new Error(`Internal: missing beat for ${head}`);
    }
    if (parts.length < 2) {
      throw new Error(`Missing panels for beat row: ${line}`);
    }
    const panelStr = parts[1];
    if (panelStr === undefined) {
      throw new Error(`Missing panels for beat row: ${line}`);
    }
    return { type: 'note', beat, panels: parsePanels(panelStr) };
  }

  throw new Error(`Unsupported step line: ${line}`);
}
