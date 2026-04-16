/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/atprotoSession', () => ({
  getAtprotoOAuthSession: vi.fn(),
  signOutAtprotoSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/util/relayHttpOrigin', () => ({
  relayHttpOriginFromEnv: vi.fn(() => 'https://relay.test'),
}));

import { getAtprotoOAuthSession, signOutAtprotoSession } from '@/auth/atprotoSession';
import {
  startInviteAllowlistWatcher,
  stopInviteAllowlistWatcher,
} from '@/auth/inviteAllowlistWatch';

describe('inviteAllowlistWatch', () => {
  const env = {
    VITE_INVITE_ONLY: '1',
    VITE_RELAY_WS: 'wss://relay.test/ws',
    VITE_RELAY_HTTP: '',
  } as ImportMetaEnv;

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(getAtprotoOAuthSession).mockReturnValue({
      sub: 'did:plc:user',
    } as never);
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    let href = '';
    Object.defineProperty(window, 'location', {
      value: {},
      configurable: true,
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => href,
      set: (v: string) => {
        href = v;
      },
    });
  });

  afterEach(() => {
    stopInviteAllowlistWatcher();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('no-ops when invite mode off', () => {
    startInviteAllowlistWatcher({ ...env, VITE_INVITE_ONLY: '0' } as ImportMetaEnv);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('polls check endpoint and signs out when not allowed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: false }),
    } as Response);

    startInviteAllowlistWatcher(env);
    await vi.waitFor(() => expect(signOutAtprotoSession).toHaveBeenCalled());
    expect(window.location.href).toBe('/');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.test/allowlist/v1/check?did=did%3Aplc%3Auser',
      expect.anything(),
    );
  });

  it('does not sign out when allowed', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    } as Response);

    startInviteAllowlistWatcher(env);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(signOutAtprotoSession).not.toHaveBeenCalled();
  });
});
