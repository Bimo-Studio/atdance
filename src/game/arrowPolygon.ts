import type { LaneIndex } from '@/game/types';

/**
 * Local (centered) outline for an arrow pointing +X (to the right).
 * Same footprint as the old rect notes/receptors so scroll positions feel unchanged.
 */
export function localArrowPoints(w: number, h: number): { x: number; y: number }[] {
  const halfW = w / 2;
  const halfH = h / 2;
  const headDepth = Math.min(w * 0.55, halfW * 0.92);
  const tailInset = w * 0.22;
  return [
    { x: halfW, y: 0 },
    { x: halfW - headDepth, y: -halfH },
    { x: -halfW + tailInset, y: -halfH * 0.3 },
    { x: -halfW + tailInset, y: halfH * 0.3 },
    { x: halfW - headDepth, y: halfH },
  ];
}

const LANE_ANGLE_RAD: readonly number[] = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];

function rotate(lx: number, ly: number, angleRad: number): { x: number; y: number } {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: lx * c - ly * s, y: lx * s + ly * c };
}

/** World-space vertices for a lane arrow centered at (cx, cy). */
export function arrowPointsForLane(
  lane: LaneIndex,
  cx: number,
  cy: number,
  w: number,
  h: number,
): { x: number; y: number }[] {
  const angle = LANE_ANGLE_RAD[lane]!;
  return localArrowPoints(w, h).map((p) => {
    const r = rotate(p.x, p.y, angle);
    return { x: cx + r.x, y: cy + r.y };
  });
}
