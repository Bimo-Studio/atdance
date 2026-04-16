import { describe, expect, it } from 'vitest';

import { agreeChartFromOffers, type ChartOfferInput } from './chartAgreement';

const base = (over: Partial<ChartOfferInput> = {}): ChartOfferInput => ({
  chartUrl: '/songs/a/a.dance',
  preferenceRank: 0,
  tieBreakId: 'alice',
  ...over,
});

describe('agreeChartFromOffers', () => {
  it('returns shared URL when both match', () => {
    const u = '/songs/x/x.dance';
    expect(
      agreeChartFromOffers(base({ chartUrl: u }), base({ chartUrl: u, tieBreakId: 'bob' })),
    ).toEqual({
      chartUrl: u,
    });
  });

  it('picks better preference rank', () => {
    expect(
      agreeChartFromOffers(
        base({ chartUrl: '/a', preferenceRank: 0 }),
        base({ chartUrl: '/b', preferenceRank: 1, tieBreakId: 'bob' }),
      ),
    ).toEqual({ chartUrl: '/a' });
  });

  it('uses tieBreakId when ranks match and URLs differ', () => {
    expect(
      agreeChartFromOffers(
        base({ chartUrl: '/late', tieBreakId: 'zebra' }),
        base({ chartUrl: '/early', tieBreakId: 'alpha' }),
      ),
    ).toEqual({ chartUrl: '/early' });
  });
});
