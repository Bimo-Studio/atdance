import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createAtprotoOAuthClient', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    const { resetAtprotoOAuthClientCacheForTests } = await import('@/auth/streamplaceOAuth');
    resetAtprotoOAuthClientCacheForTests();
  });

  it('returns null when PDS host unset', async () => {
    vi.stubEnv('VITE_ATPROTO_PDS_HOST', '');
    const { createAtprotoOAuthClient } = await import('@/auth/streamplaceOAuth');
    expect(createAtprotoOAuthClient()).toBeNull();
  });
});
