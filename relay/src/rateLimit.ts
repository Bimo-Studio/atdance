/**
 * In-memory join rate limit per IP (plan Phase 4.4; resets on Worker cold start).
 */

export interface JoinRateState {
  readonly buckets: ReadonlyMap<string, readonly number[]>;
}

export function createJoinRateState(): JoinRateState {
  return { buckets: new Map() };
}

export function allowJoinForIp(
  state: JoinRateState,
  ip: string,
  nowMs: number,
  maxPerWindow: number,
  windowMs: number,
): { allowed: boolean; state: JoinRateState } {
  const prev = state.buckets.get(ip) ?? [];
  const recent = prev.filter((t) => nowMs - t < windowMs);
  if (recent.length >= maxPerWindow) {
    return { allowed: false, state };
  }
  const next = [...recent, nowMs];
  const buckets = new Map(state.buckets);
  buckets.set(ip, next);
  return { allowed: true, state: { buckets } };
}
