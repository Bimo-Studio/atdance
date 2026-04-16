/**
 * Lane geometry when sharing the canvas with a PvP opponent panel (PRD G7 — minimal split).
 *
 * Solo layout scales default lane spacing to `width`; PvP keeps lanes in the left band and reserves the right for opponent HUD.
 */
export const DEFAULT_SOLO_LANE_CENTERS: readonly number[] = [120, 280, 440, 600];

export interface PlayfieldLayout {
  readonly laneCenters: readonly number[];
  /** Vertical separator x (canvas px); null when solo. */
  readonly splitDividerX: number | null;
  /** Right edge of local playfield (hit line, notes); excludes opponent strip. */
  readonly playfieldRightX: number;
}

export function playfieldLayoutForWidth(width: number, pvpOpponentPanel: boolean): PlayfieldLayout {
  const margin = Math.max(20, Math.floor(width * 0.04));
  const splitDividerX = pvpOpponentPanel ? Math.floor(width * 0.55) : null;
  const playfieldRightX = splitDividerX !== null ? splitDividerX - 14 : width - margin;
  const leftEdge = margin + 12;
  const span = Math.max(200, playfieldRightX - leftEdge);
  const baseMin = DEFAULT_SOLO_LANE_CENTERS[0]!;
  const baseMax = DEFAULT_SOLO_LANE_CENTERS[3]!;
  const baseSpan = baseMax - baseMin;
  const laneCenters = DEFAULT_SOLO_LANE_CENTERS.map(
    (x) => leftEdge + ((x - baseMin) / baseSpan) * span,
  );
  return { laneCenters, splitDividerX, playfieldRightX };
}
