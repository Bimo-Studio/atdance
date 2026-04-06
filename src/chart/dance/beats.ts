/** Beat lengths in quarter-note units (matches pydance `DanceFile.BEATS`). */
export const DANCE_BEATS: Readonly<Record<string, number>> = {
  x: 0.25,
  t: 0.5,
  u: 1.0 / 3.0,
  f: 2.0 / 3.0,
  s: 1.0,
  w: 4.0 / 3.0,
  e: 2.0,
  q: 4.0,
  h: 8.0,
  o: 16.0,
  n: 1 / 12.0,
} as const;

export function isBeatToken(token: string): token is keyof typeof DANCE_BEATS {
  return token in DANCE_BEATS;
}
