interface Scheduled {
  readonly atSec: number;
  readonly run: () => void;
}

/**
 * Lookahead queue: register work at absolute audio times; drain with `tick(nowSec)`.
 */
export class AudioScheduler {
  private readonly pending: Scheduled[] = [];

  schedule(atSec: number, run: () => void): void {
    this.pending.push({ atSec, run });
    this.pending.sort((a, b) => a.atSec - b.atSec);
  }

  clear(): void {
    this.pending.length = 0;
  }

  /** Run all callbacks with `atSec <= nowSec` (in order). */
  tick(nowSec: number): void {
    while (this.pending.length > 0) {
      const first = this.pending[0];
      if (first === undefined || first.atSec > nowSec) {
        break;
      }
      this.pending.shift();
      first.run();
    }
  }

  get length(): number {
    return this.pending.length;
  }
}
