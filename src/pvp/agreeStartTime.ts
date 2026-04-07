/**
 * Wall-clock start agreement (PRD §8). Pure helper — wire to P2P exchange in scenes later.
 */
export function agreeStartAtUnixMs(opts: {
  readonly nowUnixMs: number;
  readonly leadInMs: number;
}): number {
  return opts.nowUnixMs + opts.leadInMs;
}
