/**
 * Versioned WebSocket sync envelope (plan Phase 4.1).
 * Relay + clients share parses; keep in sync with `relay/` when adding variants.
 */
import { z } from 'zod';

const joinQueue = z
  .object({
    type: z.literal('joinQueue'),
    clientId: z.string().min(1),
  })
  .strict();

const paired = z
  .object({
    type: z.literal('paired'),
    roomId: z.string().min(1),
    peerClientId: z.string().min(1).optional(),
  })
  .strict();

const ping = z
  .object({
    type: z.literal('ping'),
    id: z.string().min(1),
    t1: z.number().finite(),
  })
  .strict();

const pong = z
  .object({
    type: z.literal('pong'),
    id: z.string().min(1),
    t1: z.number().finite(),
    t2: z.number().finite(),
    t3: z.number().finite(),
  })
  .strict();

const syncSample = z
  .object({
    type: z.literal('syncSample'),
    id: z.string().min(1),
    t: z.number().finite(),
    offsetMs: z.number().finite().optional(),
  })
  .strict();

const leave = z
  .object({
    type: z.literal('leave'),
    roomId: z.string().min(1).optional(),
  })
  .strict();

/** Relay → client (rate limits, etc.); plan Phase 4.4. */
const relayError = z
  .object({
    type: z.literal('error'),
    code: z.string().min(1),
  })
  .strict();

export const syncMessageV1Schema = z.discriminatedUnion('type', [
  joinQueue,
  paired,
  ping,
  pong,
  syncSample,
  leave,
  relayError,
]);

export type SyncMessageV1 = z.infer<typeof syncMessageV1Schema>;

export function parseSyncMessageV1(text: string): SyncMessageV1 | null {
  try {
    const j = JSON.parse(text) as unknown;
    return syncMessageV1Schema.parse(j);
  } catch {
    return null;
  }
}

export function stringifySyncMessageV1(msg: SyncMessageV1): string {
  return JSON.stringify(msg);
}
