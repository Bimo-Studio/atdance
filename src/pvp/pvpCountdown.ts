/** Wall-clock countdown digit (3→2→1) over `leadInMs` before `agreedStartAtUnixMs` (PRD §8). */
export function countdownDigitFromRemainingMs(remainingMs: number, leadInMs: number): string {
  if (remainingMs <= 0) {
    return '';
  }
  const elapsed = leadInMs - remainingMs;
  const idx = Math.min(3, Math.floor(elapsed / 1000));
  return String(Math.max(1, 3 - idx));
}
