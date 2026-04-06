/**
 * Relay WebSocket JSON ping parse (aligned with `src/sync/syncMessage.ts` ping shape).
 * Unit-tested without deploying the Worker (plan Phase 0.6).
 */
export function parseSyncPingPayload(text: string): { id: string; t1: number } | null {
  try {
    const j = JSON.parse(text) as unknown;
    if (typeof j !== 'object' || j === null) {
      return null;
    }
    const o = j as Record<string, unknown>;
    if (o.type !== 'ping' || typeof o.id !== 'string' || typeof o.t1 !== 'number') {
      return null;
    }
    return { id: o.id, t1: o.t1 };
  } catch {
    return null;
  }
}
