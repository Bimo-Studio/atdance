/**
 * ICE / WebRTC config (PRD F5, P1.3). STUN defaults; TURN shape reserved for P3.
 */
import { z } from 'zod';

/** Public STUN servers — override via env when wired (P1.3). */
export const DEFAULT_PUBLIC_STUN_URLS: readonly string[] = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

const turnServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export type TurnServerConfig = z.infer<typeof turnServerSchema>;

export type IceServerEntry =
  | { urls: string | string[]; username?: string; credential?: string }
  | { urls: string | string[] };

/**
 * Build `RTCPeerConnection` `iceServers` array: STUN from defaults + optional TURN (P3).
 */
export function buildIceServers(opts: {
  /** Extra STUN/TURN urls (e.g. from `VITE_P2P_STUN` later). */
  extraUrls?: string[];
  /** TURN credentials when P3 enables them. */
  turn?: TurnServerConfig[] | null;
}): IceServerEntry[] {
  const stun: IceServerEntry[] = [...DEFAULT_PUBLIC_STUN_URLS.map((urls) => ({ urls }))];
  if (opts.extraUrls?.length) {
    stun.push({ urls: opts.extraUrls });
  }
  if (opts.turn?.length) {
    const parsed = z.array(turnServerSchema).safeParse(opts.turn);
    if (!parsed.success) {
      throw new Error(`Invalid TURN config: ${parsed.error.message}`);
    }
    return [...stun, ...parsed.data];
  }
  return stun;
}
