import { describe, expect, it } from 'vitest';

import { arrowPointsForLane, localArrowPoints } from './arrowPolygon';

describe('localArrowPoints', () => {
  it('returns a convex pentagon in expected bounds', () => {
    const pts = localArrowPoints(68, 38);
    expect(pts).toHaveLength(5);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    expect(maxX - minX).toBeLessThanOrEqual(68 + 1e-6);
    expect(maxY - minY).toBeLessThanOrEqual(38 + 1e-6);
    expect(pts[0]?.x).toBeCloseTo(34, 5);
    expect(pts[0]?.y).toBeCloseTo(0, 5);
  });
});

describe('arrowPointsForLane', () => {
  it('orients right lane so the tip is right of center', () => {
    const cx = 400;
    const cy = 300;
    const pts = arrowPointsForLane(3, cx, cy, 68, 38);
    const maxX = Math.max(...pts.map((p) => p.x));
    expect(maxX).toBeGreaterThan(cx + 10);
  });

  it('orients left lane so the tip is left of center', () => {
    const cx = 400;
    const cy = 300;
    const pts = arrowPointsForLane(0, cx, cy, 68, 38);
    const minX = Math.min(...pts.map((p) => p.x));
    expect(minX).toBeLessThan(cx - 10);
  });

  it('orients down lane so the tip is below center', () => {
    const cx = 400;
    const cy = 300;
    const pts = arrowPointsForLane(1, cx, cy, 68, 38);
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(maxY).toBeGreaterThan(cy + 10);
  });

  it('orients up lane so the tip is above center', () => {
    const cx = 400;
    const cy = 300;
    const pts = arrowPointsForLane(2, cx, cy, 68, 38);
    const minY = Math.min(...pts.map((p) => p.y));
    expect(minY).toBeLessThan(cy - 10);
  });
});
