/**
 * pydance `TimeJudge` — constant time windows (seconds × judgescale).
 * @see `beatgen/pydance/judge.py` TimeJudge
 */
export type TimeGrade = 'V' | 'P' | 'G' | 'O' | 'B';

/** Hit quality or miss (pydance `M`). */
export type JudgmentGrade = TimeGrade | 'M';

const V = 0.0225;
const P = 0.045;
const G = 0.09;
const O = 0.135;
const B = 0.18;
const OK = 0.25;

/** Late miss: arrow is past the "B" window (pydance `_is_miss`). */
export function isMissLate(songTimeSec: number, noteTimeSec: number, judgescale: number): boolean {
  return noteTimeSec < songTimeSec - judgescale * B;
}

/**
 * Rate a hit from signed error `songTimeSec - noteTimeSec` (symmetric windows).
 * Returns `null` if outside all windows.
 */
export function rateTimeJudge(offsetSec: number, judgescale: number): TimeGrade | null {
  const o = Math.abs(offsetSec);
  const s = judgescale;
  if (o < s * V) {
    return 'V';
  }
  if (o < s * P) {
    return 'P';
  }
  if (o < s * G) {
    return 'G';
  }
  if (o < s * O) {
    return 'O';
  }
  if (o < s * B) {
    return 'B';
  }
  return null;
}

/** Largest |offset| that still produces a grade (B tier edge, exclusive of null). */
export function okWindowSec(judgescale: number): number {
  return judgescale * OK;
}

export { B as TIME_JUDGE_B_SEC, OK as TIME_JUDGE_OK_SEC };
