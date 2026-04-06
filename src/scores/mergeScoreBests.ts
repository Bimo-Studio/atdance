/**
 * When merging local IndexedDB bests with remote (or another device), keep max per key.
 * Plan Phase 3.4 — optional “upload local scores” pre-step.
 */
export function mergeBestScoresByKey(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map(a);
  for (const [k, v] of b) {
    const prev = out.get(k);
    out.set(k, prev === undefined || v > prev ? v : prev);
  }
  return out;
}
