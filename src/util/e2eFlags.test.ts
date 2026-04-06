import { describe, expect, it } from 'vitest';

import { e2eFromSearch } from '@/util/e2eFlags';

describe('e2eFromSearch', () => {
  it('is true when e2e=1', () => {
    expect(e2eFromSearch('?e2e=1')).toBe(true);
    expect(e2eFromSearch('?foo=1&e2e=1')).toBe(true);
  });

  it('is false when e2e missing or not 1', () => {
    expect(e2eFromSearch('')).toBe(false);
    expect(e2eFromSearch('?e2e=0')).toBe(false);
    expect(e2eFromSearch('?e2e=true')).toBe(false);
  });
});
