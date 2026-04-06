/**
 * NTP-style clock sync using four UTC timestamps (ms since epoch).
 * Offset is server minus client (positive ⇒ client clock behind server).
 */

export function ntpOffsetMs(t1: number, t2: number, t3: number, t4: number): number {
  return (t2 - t1 + (t3 - t4)) / 2;
}

export function ntpRttMs(t1: number, t2: number, t3: number, t4: number): number {
  return t4 - t1 - (t3 - t2);
}

export function emaAlpha(prev: number | null, sample: number, alpha: number): number {
  if (prev === null) {
    return sample;
  }
  return alpha * sample + (1 - alpha) * prev;
}
