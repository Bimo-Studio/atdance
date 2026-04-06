import { describe, expect, it } from 'vitest';

import { buildPlayKey, computeBestUpdate } from './localBest';

describe('buildPlayKey', () => {
  it('uses minimal slug', () => {
    expect(buildPlayKey({ useMinimal: true }, 0)).toBe('minimal');
  });

  it('combines chart URL and index', () => {
    expect(buildPlayKey({ chartUrl: '/songs/a.dance' }, 1)).toBe('/songs/a.dance|1');
  });
});

describe('computeBestUpdate', () => {
  it('records improvement', () => {
    expect(computeBestUpdate(10, 20)).toEqual({ best: 20, changed: true });
  });

  it('keeps prior when not better', () => {
    expect(computeBestUpdate(20, 10)).toEqual({ best: 20, changed: false });
  });

  it('treats undefined as zero', () => {
    expect(computeBestUpdate(undefined, 5)).toEqual({ best: 5, changed: true });
    expect(computeBestUpdate(undefined, 0)).toEqual({ best: 0, changed: false });
  });
});
