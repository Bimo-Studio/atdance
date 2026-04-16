import { describe, expect, it, vi } from 'vitest';

import type { OAuthSession } from '@atproto/oauth-client-browser';

import { getOAuthAccessTokenForRelay } from '@/auth/oauthAccessToken';

describe('getOAuthAccessTokenForRelay', () => {
  it('returns Authorization header value from token set', async () => {
    const session = {
      getTokenSet: vi.fn().mockResolvedValue({
        access_token: 'tok',
        token_type: 'DPoP',
      }),
    } as unknown as OAuthSession;
    await expect(getOAuthAccessTokenForRelay(session)).resolves.toEqual({
      headerValue: 'DPoP tok',
    });
  });

  it('defaults token type to Bearer when empty', async () => {
    const session = {
      getTokenSet: vi.fn().mockResolvedValue({
        access_token: 'x',
        token_type: '',
      }),
    } as unknown as OAuthSession;
    await expect(getOAuthAccessTokenForRelay(session)).resolves.toEqual({
      headerValue: 'Bearer x',
    });
  });

  it('returns null when getTokenSet throws', async () => {
    const session = {
      getTokenSet: vi.fn().mockRejectedValue(new Error('no session')),
    } as unknown as OAuthSession;
    await expect(getOAuthAccessTokenForRelay(session)).resolves.toBeNull();
  });
});
