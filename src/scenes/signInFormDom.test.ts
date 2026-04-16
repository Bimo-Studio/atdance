/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/streamplaceOAuth', () => ({
  loadAtprotoOAuthClient: vi.fn(),
}));

import { currentAtdanceOAuthRedirectUri } from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';
import { wireAtprotoSignInForm } from '@/scenes/signInFormDom';

function rootRedirectMatcher() {
  const redirect_uri = currentAtdanceOAuthRedirectUri({
    origin: window.location.origin,
    pathname: window.location.pathname,
  });
  return expect.objectContaining({ redirect_uri });
}

describe('wireAtprotoSignInForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts OAuth redirect when Sign in is clicked with a handle', async () => {
    const signInRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);

    const input = document.createElement('input');
    const button = document.createElement('button');
    const status = document.createElement('span');
    input.value = 'alice.test';
    wireAtprotoSignInForm(input, button, status);

    button.click();
    await vi.waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith('alice.test', rootRedirectMatcher()),
    );
  });

  it('starts OAuth redirect when Enter is pressed in the handle field', async () => {
    const signInRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);

    const input = document.createElement('input');
    const button = document.createElement('button');
    const status = document.createElement('span');
    input.value = 'bob.test';
    wireAtprotoSignInForm(input, button, status);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith('bob.test', rootRedirectMatcher()),
    );
  });

  it('strips leading @ before signInRedirect so identity resolution accepts the handle', async () => {
    const signInRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);

    const input = document.createElement('input');
    const button = document.createElement('button');
    const status = document.createElement('span');
    input.value = '  @distributed.camp ';
    wireAtprotoSignInForm(input, button, status);

    button.click();
    await vi.waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith('distributed.camp', rootRedirectMatcher()),
    );
  });

  it('tells the user upstream may be overloaded when fetch fails', async () => {
    const logErr = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    try {
      const signInRedirect = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);

      const input = document.createElement('input');
      const button = document.createElement('button');
      const status = document.createElement('span');
      input.value = 'user.test';
      wireAtprotoSignInForm(input, button, status);

      button.click();
      await vi.waitFor(() =>
        expect(status.textContent).toContain('could not reach ATProto or Bluesky'),
      );
    } finally {
      logErr.mockRestore();
    }
  });

  it('does not submit on other keys', async () => {
    const signInRedirect = vi.fn();
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);

    const input = document.createElement('input');
    const button = document.createElement('button');
    const status = document.createElement('span');
    input.value = 'x.test';
    wireAtprotoSignInForm(input, button, status);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(signInRedirect).not.toHaveBeenCalled();
  });
});
