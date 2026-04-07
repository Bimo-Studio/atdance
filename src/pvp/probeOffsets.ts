/**
 * Map RTT samples to synthetic offset samples for epoch-uncertainty gating (PRD §8 / §11)
 * when NTP offset samples are not yet exchanged on the PvP path.
 */
export function syntheticOffsetSamplesFromRttMs(rttMs: readonly number[]): number[] {
  if (rttMs.length === 0) {
    return [];
  }
  const mean = rttMs.reduce((a, b) => a + b, 0) / rttMs.length;
  return rttMs.map((r) => (r - mean) / 2);
}
