import { toRealTime } from '@/chart/dance/toRealTime';

import type { TimeGrade } from '@/judge/timeJudge';

/** One “tick” unit used by pydance `BeatJudge` (see `judge.py`). */
const BEAT_JUDGE_STEP = 0.16666666666666666;

export function beatJudgeTickSec(bpm: number): number {
  return toRealTime(bpm, BEAT_JUDGE_STEP);
}

/**
 * pydance `BeatJudge._get_rating` — distance in tick units from the note.
 */
export function rateBeatJudge(
  offsetSec: number,
  judgescale: number,
  bpm: number,
): TimeGrade | null {
  const tick = beatJudgeTickSec(bpm);
  if (tick <= 0) {
    return null;
  }
  const off = Math.abs(offsetSec) / tick;
  const s = judgescale;
  if (off <= s * 1) {
    return 'V';
  }
  if (off <= s * 4) {
    return 'P';
  }
  if (off <= s * 7) {
    return 'G';
  }
  if (off <= s * 9) {
    return 'O';
  }
  if (off < s * 12) {
    return 'B';
  }
  return null;
}

/**
 * Late miss: uses `_b * _tick` seconds (pydance stores `_b_ticks` for other uses; expire uses `_is_miss` with raw `_b` which is inconsistent — we use tick-scaled seconds).
 */
export function isMissLateBeat(
  songTimeSec: number,
  noteTimeSec: number,
  judgescale: number,
  bpm: number,
): boolean {
  const tick = beatJudgeTickSec(bpm);
  const bSec = judgescale * 12 * tick;
  return noteTimeSec < songTimeSec - bSec;
}
