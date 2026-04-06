/**
 * Converts beat length (in pydance quarter units) to seconds at `bpm`.
 * Matches `util.toRealTime` in pydance: `steps * 0.25 * 60.0 / bpm`.
 */
export function toRealTime(bpm: number, beatUnits: number): number {
  return beatUnits * 0.25 * (60.0 / bpm);
}
