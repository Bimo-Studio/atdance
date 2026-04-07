/**
 * Pre-match RTT gate (PRD §6). Values in milliseconds.
 */
export type MatchRejectReason = 'rtt_mean' | 'rtt_p95' | 'jitter' | 'too_few_samples';

export interface MatchQualityResult {
  readonly accept: boolean;
  readonly reason?: MatchRejectReason;
}

const DEFAULT = {
  acceptMeanMax: 120,
  rejectMeanMin: 160,
  rejectP95Min: 200,
  rejectJitterStdMin: 40,
  softMeanMax: 160,
  softJitterMax: 25,
  minSamples: 5,
} as const;

function mean(xs: readonly number[]): number {
  if (xs.length === 0) {
    return NaN;
  }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function p95(xs: readonly number[]): number {
  if (xs.length === 0) {
    return NaN;
  }
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor(0.95 * (s.length - 1)));
  return s[idx] ?? NaN;
}

function stdev(xs: readonly number[]): number {
  if (xs.length < 2) {
    return 0;
  }
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/** Stddev of RTT samples (ms) — for `PeerRttTable.lastJitterMs` after a probe burst. */
export function rttJitterStdMs(samples: readonly number[]): number {
  return stdev(samples);
}

/**
 * Evaluate RTT samples (one-way or round-trip, be consistent across probes).
 */
export function evaluateMatchQuality(
  rttSamplesMs: readonly number[],
  opts: Partial<typeof DEFAULT> = {},
): MatchQualityResult {
  const o = { ...DEFAULT, ...opts };
  if (rttSamplesMs.length < o.minSamples) {
    return { accept: false, reason: 'too_few_samples' };
  }
  const m = mean(rttSamplesMs);
  const p = p95(rttSamplesMs);
  const j = stdev(rttSamplesMs);
  if (m > o.rejectMeanMin) {
    return { accept: false, reason: 'rtt_mean' };
  }
  if (p > o.rejectP95Min) {
    return { accept: false, reason: 'rtt_p95' };
  }
  if (j > o.rejectJitterStdMin) {
    return { accept: false, reason: 'jitter' };
  }
  if (m <= o.acceptMeanMax) {
    return { accept: true };
  }
  if (m < o.softMeanMax && j <= o.softJitterMax) {
    return { accept: true };
  }
  return { accept: false, reason: 'rtt_mean' };
}
