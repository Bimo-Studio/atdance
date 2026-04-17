/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/bsky/publicAppview', () => ({
  fetchBskyHandleForDid: vi.fn(),
  resolveAtHandleToDid: vi.fn(),
  searchActorsTypeahead: vi.fn(),
}));

vi.mock('@/auth/atprotoSession', () => ({
  initAtprotoSessionOnBoot: vi.fn().mockResolvedValue(undefined),
  getAtprotoOAuthSession: vi.fn(),
  signOutAtprotoSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/auth/streamplaceOAuth', () => ({
  loadAtprotoOAuthClient: vi.fn(),
}));

vi.mock('@/util/relayHttpOrigin', () => ({
  relayHttpOriginFromEnv: vi.fn(() => 'https://relay.test'),
}));

import {
  fetchBskyHandleForDid,
  resolveAtHandleToDid,
  searchActorsTypeahead,
} from '@/bsky/publicAppview';
import { getAtprotoOAuthSession, initAtprotoSessionOnBoot } from '@/auth/atprotoSession';
import { canonicalOAuthAppRootRedirectUri } from '@/auth/loopbackOAuthRedirectUris';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';
import {
  ADMIN_UI_HANDLE,
  ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY,
  mountAdminApp,
  resetAdminTableSelectionForTests,
} from '@/admin/main';

function mockAdminOAuthSession(
  sub: string,
  fetchMock: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
): void {
  vi.mocked(getAtprotoOAuthSession).mockReturnValue({
    sub,
    fetchHandler: (pathname: string, init?: RequestInit) => fetchMock(pathname, init),
  } as never);
}

function adminSignInRedirectMatcher() {
  return expect.objectContaining({
    redirect_uri: canonicalOAuthAppRootRedirectUri(window.location),
  });
}

describe('mountAdminApp', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '<div id="root"></div>';
    sessionStorage.removeItem(ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY);
    resetAdminTableSelectionForTests();
    vi.mocked(initAtprotoSessionOnBoot).mockClear();
    vi.mocked(getAtprotoOAuthSession).mockReset();
    vi.mocked(fetchBskyHandleForDid).mockReset();
    vi.mocked(resolveAtHandleToDid).mockReset();
    vi.mocked(searchActorsTypeahead).mockReset();
    vi.mocked(loadAtprotoOAuthClient).mockReset();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 0, entries: [], adminHandle: ADMIN_UI_HANDLE }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders sign-in card when there is no session', async () => {
    vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('Sign in with the same ATProto account');
    expect(root.textContent).toContain('operator token');
  });

  it('renders allowlist shell using relay operator token without OAuth session', async () => {
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_TOKEN_SESSION_KEY, 'secret-op');
    vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 1,
        adminHandle: ADMIN_UI_HANDLE,
        entries: [{ did: 'did:plc:a', handle: 'a.test' }],
      }),
    } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('Clear operator token');
    expect(root.textContent).toContain('did:plc:a');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.test/admin/allowlist/v1',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const hdrs = fetchMock.mock.calls[0]![1]!.headers as Headers;
    expect(hdrs.get('Authorization')).toBe('Bearer secret-op');
  });

  it('starts OAuth from admin sign-in card when Enter is pressed in handle field', async () => {
    vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);
    const signInRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const input = root.querySelector('input.al-input') as HTMLInputElement;
    input.value = 'chef.test';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith('chef.test', adminSignInRedirectMatcher()),
    );
  });

  it('shows a service-oriented message when OAuth redirect fails with a network error', async () => {
    const logErr = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    try {
      vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);
      const signInRedirect = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);
      const root = document.getElementById('root')!;
      await mountAdminApp(root);
      const input = root.querySelector('input.al-input') as HTMLInputElement;
      input.value = 'chef.test';
      const btn = root.querySelector('button.al-btn') as HTMLButtonElement;
      btn.click();
      await vi.waitFor(() =>
        expect(root.querySelector('.al-signin-feedback')?.textContent).toContain(
          'could not reach ATProto or Bluesky',
        ),
      );
    } finally {
      logErr.mockRestore();
    }
  });

  it('strips @ from admin sign-in handle before OAuth redirect', async () => {
    vi.mocked(getAtprotoOAuthSession).mockReturnValue(null);
    const signInRedirect = vi.fn().mockResolvedValue(undefined);
    vi.mocked(loadAtprotoOAuthClient).mockResolvedValue({ signInRedirect } as never);
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const input = root.querySelector('input.al-input') as HTMLInputElement;
    input.value = '@pat.example';
    const btn = root.querySelector('button.al-btn') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() =>
      expect(signInRedirect).toHaveBeenCalledWith('pat.example', adminSignInRedirectMatcher()),
    );
  });

  it('renders access denied when handle is not admin', async () => {
    vi.mocked(getAtprotoOAuthSession).mockReturnValue({ sub: 'did:plc:x' } as never);
    vi.mocked(resolveAtHandleToDid).mockImplementation(async (h: string) =>
      h === ADMIN_UI_HANDLE ? 'did:plc:realadmin' : null,
    );
    vi.mocked(fetchBskyHandleForDid).mockResolvedValue('other.bsky.social');
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toMatch(/change the guest list/);
  });

  it('shows relay auth reason when allowlist GET returns 403 with JSON body', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    mockAdminOAuthSession('did:plc:admin', fetchMock);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'admin_auth_failed', reason: 'forbidden' }),
    } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Not authorized (admin only)');
      expect(root.textContent).toContain('does not match the DID for the configured admin handle');
    });
  });

  it('renders shell when session DID matches resolved admin DID (profile lookup not required)', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    mockAdminOAuthSession('did:plc:admin', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 1,
        adminHandle: ADMIN_UI_HANDLE,
        entries: [{ did: 'did:plc:a', handle: 'a.test' }],
      }),
    } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('Remove selected');
    expect(root.textContent).toContain('did:plc:a');
    expect(fetchBskyHandleForDid).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.test/admin/allowlist/v1',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('runs typeahead after @ input (debounced)', async () => {
    vi.useFakeTimers();
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    mockAdminOAuthSession('did:plc:admin', fetchMock);
    vi.mocked(searchActorsTypeahead).mockResolvedValue([{ did: 'did:plc:s', handle: 's.test' }]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 1,
        adminHandle: ADMIN_UI_HANDLE,
        entries: [],
      }),
    } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const inputs = root.querySelectorAll('input.al-input');
    const mainInput = inputs[inputs.length - 1] as HTMLInputElement;
    mainInput.value = '@su';
    mainInput.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(250);
    expect(searchActorsTypeahead).toHaveBeenCalledWith('@su', 8);
  });

  it('Add resolves naked handle and POSTs add', async () => {
    mockAdminOAuthSession('did:plc:admin', fetchMock);
    vi.mocked(resolveAtHandleToDid).mockImplementation(async (h: string) => {
      if (h === ADMIN_UI_HANDLE) {
        return 'did:plc:admin';
      }
      if (h === 'bob.test') {
        return 'did:plc:bob';
      }
      return null;
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: 1,
          adminHandle: ADMIN_UI_HANDLE,
          entries: [{ did: 'did:plc:a', handle: 'a' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            { did: 'did:plc:a', handle: 'a' },
            { did: 'did:plc:bob', handle: 'bob.test' },
          ],
        }),
      } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const inputs = root.querySelectorAll('input.al-input');
    const mainInput = inputs[inputs.length - 1] as HTMLInputElement;
    mainInput.value = 'bob.test';
    const addBtn = root.querySelector('button.al-btn--primary') as HTMLButtonElement;
    addBtn.click();
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://relay.test/admin/allowlist/v1/add',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(resolveAtHandleToDid).toHaveBeenCalledWith('bob.test');
  });

  it('Remove selected POSTs remove', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    mockAdminOAuthSession('did:plc:admin', fetchMock);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: 1,
          adminHandle: ADMIN_UI_HANDLE,
          entries: [{ did: 'did:plc:row', handle: 'r' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [] }),
      } as Response);

    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const row = root.querySelector('tr.al-row')!;
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const removeBtn = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === 'Remove selected',
    )!;
    removeBtn.click();
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://relay.test/admin/allowlist/v1/remove',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
