/**
 * Deterministic PRNG for spawn timing (testable; not cryptographic).
 * @see https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function spawnDelayMs(rng: () => number, min: number, max: number): number {
  if (max < min) {
    throw new RangeError('spawnDelayMs: max < min');
  }
  return min + Math.floor(rng() * (max - min + 1));
}
