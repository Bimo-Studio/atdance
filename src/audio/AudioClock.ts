/**
 * Thin wrapper around Web Audio's clock — the only source of truth for rhythm timing.
 */
export class AudioClock {
  constructor(private readonly ctx: AudioContext) {}

  get context(): AudioContext {
    return this.ctx;
  }

  /** Seconds on the audio timeline (same as `AudioContext.currentTime`). */
  get currentTimeSeconds(): number {
    return this.ctx.currentTime;
  }
}
