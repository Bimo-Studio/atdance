import { describe, expect, it } from 'vitest';

import { digitIndexFromKey, SONG_SELECT_ROWS } from './songSelectRows';

describe('SONG_SELECT_ROWS', () => {
  it('lists six built-in HTTP demos', () => {
    expect(SONG_SELECT_ROWS).toHaveLength(6);
    expect(SONG_SELECT_ROWS[1]?.data.chartUrl).toContain('synrg');
  });
});

describe('digitIndexFromKey', () => {
  it('maps digit keys to row indices', () => {
    expect(digitIndexFromKey('Digit1')).toBe(0);
    expect(digitIndexFromKey('Digit6')).toBe(5);
    expect(digitIndexFromKey('KeyA')).toBeNull();
  });
});
