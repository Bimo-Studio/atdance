/**
 * Abstraction for pre-match RTT collection (PRD §6 / tasks P3.3).
 */
export interface ProbeTransport {
  /** Collect one-way or round-trip RTT samples (ms); be consistent with `evaluateMatchQuality`. */
  collectRttSamples(
    remoteDid: string,
    sampleCount: number,
    signal?: AbortSignal,
  ): Promise<readonly number[]>;
}

export type RttSampleFactory = (remoteDid: string, i: number) => number;

/**
 * Deterministic / test doubles: returns `samples[i]` or `factory(did,i)` per sample.
 */
export class MockProbeTransport implements ProbeTransport {
  constructor(
    private readonly opts:
      | { readonly fixedMs: number }
      | { readonly samples: readonly number[] }
      | { readonly factory: RttSampleFactory },
  ) {}

  async collectRttSamples(remoteDid: string, sampleCount: number): Promise<readonly number[]> {
    const out: number[] = [];
    for (let i = 0; i < sampleCount; i += 1) {
      if ('fixedMs' in this.opts) {
        out.push(this.opts.fixedMs);
      } else if ('samples' in this.opts) {
        out.push(this.opts.samples[i] ?? this.opts.samples[this.opts.samples.length - 1] ?? 80);
      } else {
        out.push(this.opts.factory(remoteDid, i));
      }
    }
    return out;
  }
}
