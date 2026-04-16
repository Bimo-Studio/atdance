/**
 * PvP match messages (PRD §11 `pvpWire` / `pvpMessageV1`). Separate namespace from `syncMessageV1`.
 */
import { z } from 'zod';

const ping = z
  .object({
    type: z.literal('pvp.v1.ping'),
    id: z.string().min(1),
    t1: z.number().finite(),
  })
  .strict();

const pong = z
  .object({
    type: z.literal('pvp.v1.pong'),
    id: z.string().min(1),
    t1: z.number().finite(),
    t2: z.number().finite(),
    t3: z.number().finite(),
  })
  .strict();

/** P3.4 — probe request (timestamps ms); distinct from relay `syncMessageV1` ping/pong. */
const probe = z
  .object({
    type: z.literal('pvp.v1.probe'),
    id: z.string().min(1),
    t1: z.number().finite(),
  })
  .strict();

const probeAck = z
  .object({
    type: z.literal('pvp.v1.probeAck'),
    id: z.string().min(1),
    t1: z.number().finite(),
    t2: z.number().finite(),
  })
  .strict();

const chartOffer = z
  .object({
    type: z.literal('pvp.v1.chartOffer'),
    chartUrl: z.string().min(1),
    preferenceRank: z.number().int().min(0).max(99),
    tieBreakId: z.string().min(1),
  })
  .strict();

const chartAck = z
  .object({
    type: z.literal('pvp.v1.chartAck'),
    chartUrl: z.string().min(1),
  })
  .strict();

const scoreTick = z
  .object({
    type: z.literal('pvp.v1.scoreTick'),
    combo: z.number().int().min(0),
    miss: z.number().int().min(0),
    score: z.number().int().optional(),
  })
  .strict();

export const pvpMessageV1Schema = z.discriminatedUnion('type', [
  ping,
  pong,
  probe,
  probeAck,
  chartOffer,
  chartAck,
  scoreTick,
]);

export type PvpMessageV1 = z.infer<typeof pvpMessageV1Schema>;

export function parsePvpMessageV1(text: string): PvpMessageV1 | null {
  try {
    const j = JSON.parse(text) as unknown;
    const o = j as { type?: string };
    if (typeof o?.type !== 'string' || !o.type.startsWith('pvp.v1.')) {
      return null;
    }
    return pvpMessageV1Schema.parse(j);
  } catch {
    return null;
  }
}

export function stringifyPvpMessageV1(msg: PvpMessageV1): string {
  return JSON.stringify(msg);
}
