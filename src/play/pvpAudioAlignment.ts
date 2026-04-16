/**
 * Map wall-clock PvP start to Web Audio buffer start + PlayScene `audioStartSec`.
 */
export function pvpSongTimeAlignment(
  agreedStartAtUnixMs: number,
  wallNowUnixMs: number,
  audioContextCurrentTimeSec: number,
): { readonly bufferOffsetSec: number; readonly audioStartSec: number } {
  const lateSec = Math.max(0, (wallNowUnixMs - agreedStartAtUnixMs) / 1000);
  return {
    bufferOffsetSec: lateSec,
    audioStartSec: audioContextCurrentTimeSec - lateSec,
  };
}

export function msUntilWallUnixMs(targetUnixMs: number, nowUnixMs: number): number {
  return Math.max(0, targetUnixMs - nowUnixMs);
}
