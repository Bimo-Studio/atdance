/**
 * Drift between wall clock and Web Audio time (plan Phase 1.2).
 * At each sample: offset = wallSec - audioSec; EMA(offset) estimates steady skew for diagnostics / correction hooks.
 */

export function emaOffsetSample(prev: number | null, sample: number, alpha: number): number {
  if (prev === null) {
    return sample;
  }
  return alpha * sample + (1 - alpha) * prev;
}

export class WallClockDriftTracker {
  private ema: number | null = null;

  constructor(private readonly alpha: number) {}

  /** Feed monotonic wall time (e.g. performance.now()/1000) and AudioContext.currentTime. */
  update(wallTimeSec: number, audioTimeSec: number): number {
    const sample = wallTimeSec - audioTimeSec;
    this.ema = emaOffsetSample(this.ema, sample, this.alpha);
    return this.ema;
  }

  get estimateSec(): number | null {
    return this.ema;
  }
}
