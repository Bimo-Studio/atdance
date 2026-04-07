import { describe, expect, it } from 'vitest';

import { e2eFromSearch, syncLabE2eFromSearch } from '@/util/e2eFlags';

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

describe('syncLabE2eFromSearch', () => {
  it('is true when sync_lab=1', () => {
    expect(syncLabE2eFromSearch('?sync_lab=1')).toBe(true);
    expect(syncLabE2eFromSearch('?e2e=1&sync_lab=1')).toBe(true);
  });

  it('is false otherwise', () => {
    expect(syncLabE2eFromSearch('')).toBe(false);
    expect(syncLabE2eFromSearch('?sync_lab=0')).toBe(false);
  });
});
