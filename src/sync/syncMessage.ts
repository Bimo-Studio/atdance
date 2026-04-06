/**
 * WebSocket sync messages (v1). Prefer {@link syncMessageV1} for full union + Zod.
 */
import type { SyncMessageV1 } from '@/sync/syncMessageV1';
import { parseSyncMessageV1 } from '@/sync/syncMessageV1';

export type SyncPingV1 = Extract<SyncMessageV1, { type: 'ping' }>;
export type SyncPongV1 = Extract<SyncMessageV1, { type: 'pong' }>;

export function parseSyncPingV1(text: string): SyncPingV1 | null {
  const m = parseSyncMessageV1(text);
  return m?.type === 'ping' ? m : null;
}

export function parseSyncPongV1(text: string): SyncPongV1 | null {
  const m = parseSyncMessageV1(text);
  return m?.type === 'pong' ? m : null;
}

export function stringifySyncPingV1(p: SyncPingV1): string {
  return JSON.stringify(p);
}
