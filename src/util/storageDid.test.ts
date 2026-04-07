import { describe, expect, it } from 'vitest';

import { e2eStorageDidFromSearch } from '@/util/storageDid';

describe('e2eStorageDidFromSearch', () => {
  it('defaults to #1 when e2e_did missing', () => {
    expect(e2eStorageDidFromSearch('?e2e=1')).toBe('did:web:e2e.atdance.local#1');
  });

  it('uses e2e_did when valid', () => {
    expect(e2eStorageDidFromSearch('?e2e=1&e2e_did=alice')).toBe('did:web:e2e.atdance.local#alice');
  });

  it('rejects unsafe e2e_did characters', () => {
    expect(e2eStorageDidFromSearch('?e2e=1&e2e_did=../x')).toBe('did:web:e2e.atdance.local#1');
  });
});
