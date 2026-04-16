import type { PvpMessageV1 } from '@/pvp/pvpMessageV1';

/**
 * Wall-clock synchronization for PvP countdown exit (PRD §8.6–8.7).
 */
export interface PlayScenePvpContext {
  /** Epoch ms when chart time 0 should align for both players. */
  agreedStartAtUnixMs: number;
  /**
   * When true, start audio automatically after chart load, respecting `agreedStartAtUnixMs`.
   * Still requires an unlocked `AudioContext` (user may need a canvas click if autoplay blocks).
   */
  autoStartAudio?: boolean;
  /** When set (relay match), sends `pvp.v1.scoreTick` to peer. */
  sendPvp?: (msg: PvpMessageV1) => void;
  /** Updated by inbound `pvp.v1.scoreTick` when `sendPvp` is wired. */
  remoteHudRef?: { combo: number; miss: number; score: number };
  /** Close relay WebSocket when leaving play (one match). */
  closeRelay?: () => void;
}

/**
 * Passed to {@link PlayScene} via `scene.start('PlayScene', data)`.
 */
export interface PlaySceneData {
  /** Use embedded minimal chart (no fetch). */
  useMinimal?: boolean;
  /** Fetch path for `.dance` text (e.g. `/songs/synrg/synrg.dance`). */
  chartUrl?: string;
  /** Index into `parseDanceFile` `charts[]` (multi-`SINGLE` files). */
  chartIndex?: number;
  /** Load chart (and optional audio) via WebTorrent; on failure uses `chartUrl` HTTP fallback. */
  magnetUri?: string;
  /** Magnet load timeout (ms); default 45s. */
  torrentTimeoutMs?: number;
  /** Optional PvP rendezvous timing (countdown target). */
  pvp?: PlayScenePvpContext;
}

/** Test / lobby helper: minimal `PlaySceneData` for PvP countdown → play (see `docs/tasks-pvp-real-sync.md` S.1). */
export function buildPlaySceneDataForPvpCountdown(opts: {
  agreedStartAtUnixMs: number;
  chartUrl?: string;
  chartIndex?: number;
  useMinimal?: boolean;
}): PlaySceneData {
  const data: PlaySceneData = {
    pvp: {
      agreedStartAtUnixMs: opts.agreedStartAtUnixMs,
      autoStartAudio: true,
    },
  };
  if (opts.useMinimal) data.useMinimal = true;
  if (opts.chartUrl !== undefined) data.chartUrl = opts.chartUrl;
  if (opts.chartIndex !== undefined) data.chartIndex = opts.chartIndex;
  return data;
}
