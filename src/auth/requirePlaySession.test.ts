import { describe, expect, it, vi } from 'vitest';

import type { OAuthSession } from '@atproto/oauth-client-browser';

import { requirePlaySession } from '@/auth/requirePlaySession';

vi.mock('@/auth/atprotoSession', () => ({
  getAtprotoOAuthSession: vi.fn(),
}));

vi.mock('@/auth/devAuthBypass', () => ({
  skipAuthGate: vi.fn(() => false),
}));

describe('requirePlaySession', () => {
  it('redirects to SignInScene when no session', async () => {
    const { getAtprotoOAuthSession } = await import('@/auth/atprotoSession');
    vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);

    const start = vi.fn();
    const scene = { scene: { start } } as never;
    expect(requirePlaySession(scene)).toBe(false);
    expect(start).toHaveBeenCalledWith('SignInScene');
  });

  it('returns true when session valid', async () => {
    const { getAtprotoOAuthSession } = await import('@/auth/atprotoSession');
    vi.mocked(getAtprotoOAuthSession).mockReturnValue({
      sub: 'did:plc:ok',
    } as unknown as OAuthSession);

    const scene = { scene: { start: vi.fn() } } as never;
    expect(requirePlaySession(scene)).toBe(true);
  });
});
