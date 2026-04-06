import { describe, expect, it } from 'vitest';

import { mergeBestScoresByKey } from './mergeScoreBests';

describe('mergeBestScoresByKey (plan Phase 3.4)', () => {
  it('keeps the higher score for each play key', () => {
    const merged = mergeBestScoresByKey(
      new Map([
        ['synrg|0', 10],
        ['fork|0', 200],
      ]),
      new Map([
        ['synrg|0', 50],
        ['fork|0', 100],
        ['extra|0', 1],
      ]),
    );
    expect(merged.get('synrg|0')).toBe(50);
    expect(merged.get('fork|0')).toBe(200);
    expect(merged.get('extra|0')).toBe(1);
  });
});
