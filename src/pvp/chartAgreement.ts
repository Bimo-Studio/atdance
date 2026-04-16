/**
 * Deterministic chart pick from two PvP offers (tasks N.1).
 */
export interface ChartOfferInput {
  readonly chartUrl: string;
  /** Lower = higher priority (slot index 0..2); use large value for defaults. */
  readonly preferenceRank: number;
  /** Lexicographic tie-break when ranks and URLs differ; use relay `clientId` or DID. */
  readonly tieBreakId: string;
}

export function agreeChartFromOffers(
  a: ChartOfferInput,
  b: ChartOfferInput,
): { readonly chartUrl: string } {
  if (a.chartUrl === b.chartUrl) {
    return { chartUrl: a.chartUrl };
  }
  if (a.preferenceRank !== b.preferenceRank) {
    return { chartUrl: a.preferenceRank <= b.preferenceRank ? a.chartUrl : b.chartUrl };
  }
  const cmp = a.tieBreakId.localeCompare(b.tieBreakId);
  return { chartUrl: cmp <= 0 ? a.chartUrl : b.chartUrl };
}
