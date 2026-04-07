import { describe, expect, it } from 'vitest';

import { topicLabelFromSearch } from '@/util/syncLabMode';

describe('topicLabelFromSearch', () => {
  it('defaults when empty', () => {
    expect(topicLabelFromSearch('')).toBe('atdance-sync-lab');
  });

  it('reads topic query param', () => {
    expect(topicLabelFromSearch('?topic=room-42')).toBe('room-42');
  });

  it('trims topic', () => {
    expect(topicLabelFromSearch('?topic=%20x%20')).toBe('x');
  });
});
