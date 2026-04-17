import { describe, expect, it } from 'vitest';

import { formatRelayAllowlistFetchError } from '@/admin/formatRelayAllowlistFetchError';

describe('formatRelayAllowlistFetchError', () => {
  it('replaces TypeError Failed to fetch with relay-specific guidance', () => {
    expect(formatRelayAllowlistFetchError(new TypeError('Failed to fetch'))).toContain(
      'relay allowlist',
    );
  });

  it('replaces bare Failed to fetch message', () => {
    expect(formatRelayAllowlistFetchError(new Error('Failed to fetch'))).toContain(
      'relay allowlist',
    );
  });

  it('passes through other errors', () => {
    expect(formatRelayAllowlistFetchError(new Error('No access token'))).toBe('No access token');
  });
});
