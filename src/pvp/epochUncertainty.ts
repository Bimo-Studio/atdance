/**
 * Epoch offset uncertainty for start-sync gating (PRD §8 / §11). Inputs: NTP offset samples (ms).
 * If uncertainty exceeds `maxUncertaintyMs`, prefer `audio_proof` clock sync path.
 */
export function maxConsecutiveOffsetDeltaMs(offsetSamples: readonly number[]): number {
  if (offsetSamples.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  let max = 0;
  for (let i = 1; i < offsetSamples.length; i += 1) {
    const d = Math.abs(offsetSamples[i]! - offsetSamples[i - 1]!);
    if (d > max) {
      max = d;
    }
  }
  return max;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sampleStdev(xs: readonly number[]): number {
  if (xs.length < 2) {
    return 0;
  }
  const m = mean(xs);
  const v = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/**
 * Half-width style uncertainty: scale sample stdev (PRD suggests comparing to 400ms gate).
 */
export function epochUncertaintyMsFromOffsets(
  offsetSamples: readonly number[],
  opts: { readonly maxDeltaWeight?: number; readonly stdevScale?: number } = {},
): number {
  const stdevScale = opts.stdevScale ?? 1.96;
  const maxDeltaWeight = opts.maxDeltaWeight ?? 1;
  if (offsetSamples.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const spread = sampleStdev(offsetSamples) * stdevScale;
  const delta = maxConsecutiveOffsetDeltaMs(offsetSamples) * maxDeltaWeight;
  return Math.max(spread, delta);
}

export function shouldUseAudioProof(
  offsetSamples: readonly number[],
  maxUncertaintyMs = 400,
): boolean {
  return epochUncertaintyMsFromOffsets(offsetSamples) > maxUncertaintyMs;
}
