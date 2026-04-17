/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/streamplaceOAuth', () => ({
  loadAtprotoOAuthClient: vi.fn(),
}));

import { ATDANCE_OAUTH_POST_LOGIN_NAV_KEY } from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';
import {
  getAtprotoOAuthSession,
  initAtprotoSessionOnBoot,
  resetAtprotoSessionForTests,
} from '@/auth/atprotoSession';

describe('initAtprotoSessionOnBoot', () => {
  beforeEach(() => {
    resetAtprotoSessionForTests();
    vi.mocked(loadAtprotoOAuthClient).mockReset();
    sessionStorage.removeItem(ATDANCE_OAUTH_POST_LOGIN_NAV_KEY);
  });

  it('uses initRestore when there is no OAuth callback in the URL', async () => {
    const initRestore = vi.fn().mockResolvedValue({ session: { sub: 'did:plc:xy' } });
    const initCallback = vi.fn();
    const readCallbackParams = vi.fn().mockReturnValue(null);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({
      readCallbackParams,
      initRestore,
      initCallback,
    } as never);

    await initAtprotoSessionOnBoot();

    expect(readCallbackParams).toHaveBeenCalled();
    expect(initRestore).toHaveBeenCalled();
    expect(initCallback).not.toHaveBeenCalled();
    expect(getAtprotoOAuthSession()?.sub).toBe('did:plc:xy');
  });

  it('uses initCallback when readCallbackParams returns params', async () => {
    const params = new URLSearchParams({ code: 'x', state: 'y' });
    const initCallback = vi.fn().mockResolvedValue({ session: { sub: 'did:plc:cb' }, state: null });
    const initRestore = vi.fn();
    const readCallbackParams = vi.fn().mockReturnValue(params);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({
      readCallbackParams,
      initRestore,
      initCallback,
    } as never);

    await initAtprotoSessionOnBoot();

    expect(initCallback).toHaveBeenCalled();
    expect(initCallback.mock.calls[0]?.[0]).toBe(params);
    expect(initRestore).not.toHaveBeenCalled();
    expect(getAtprotoOAuthSession()?.sub).toBe('did:plc:cb');
  });

  it('after OAuth callback, replaces location when post-login nav key is set', async () => {
    const replaceSpy = vi.spyOn(window.location, 'replace').mockImplementation(vi.fn());
    sessionStorage.setItem(ATDANCE_OAUTH_POST_LOGIN_NAV_KEY, '/admin/');

    const params = new URLSearchParams({ code: 'x', state: 'y' });
    const initCallback = vi
      .fn()
      .mockResolvedValue({ session: { sub: 'did:plc:nav' }, state: null });
    const initRestore = vi.fn();
    const readCallbackParams = vi.fn().mockReturnValue(params);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({
      readCallbackParams,
      initRestore,
      initCallback,
    } as never);

    await initAtprotoSessionOnBoot();

    expect(replaceSpy).toHaveBeenCalledWith(`${window.location.origin}/admin/`);
    expect(sessionStorage.getItem(ATDANCE_OAUTH_POST_LOGIN_NAV_KEY)).toBeNull();
    expect(getAtprotoOAuthSession()?.sub).toBe('did:plc:nav');
    replaceSpy.mockRestore();
  });

  it('clears session when init exceeds deadline', async () => {
    vi.useFakeTimers();
    try {
      const initRestore = vi.fn(
        () =>
          new Promise<{ session: { sub: string } }>(() => {
            /* never resolves */
          }),
      );
      vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({
        readCallbackParams: vi.fn().mockReturnValue(null),
        initRestore,
        initCallback: vi.fn(),
      } as never);

      const p = initAtprotoSessionOnBoot();
      await vi.advanceTimersByTimeAsync(20_000);
      await p;

      expect(getAtprotoOAuthSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
