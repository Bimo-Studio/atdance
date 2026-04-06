/**
 * Heuristic instability detection for NTP-style offset samples (plan Phase 4.3).
 */

export function offsetSampleSpreadMs(offsets: readonly number[]): number {
  if (offsets.length < 2) {
    return 0;
  }
  return Math.max(...offsets) - Math.min(...offsets);
}

export function isOffsetUnstable(offsets: readonly number[], maxSpreadMs: number): boolean {
  return offsetSampleSpreadMs(offsets) > maxSpreadMs;
}
