/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/bsky/publicAppview', () => ({
  resolveAtHandleToDid: vi.fn(),
  searchActorsTypeahead: vi.fn(),
}));

vi.mock('@/util/relayHttpOrigin', () => ({
  relayHttpOriginFromEnv: vi.fn(() => 'https://relay.test'),
}));

import { resolveAtHandleToDid, searchActorsTypeahead } from '@/bsky/publicAppview';
import {
  ADMIN_UI_HANDLE,
  ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY,
  mountAdminApp,
  resetAdminTableSelectionForTests,
} from '@/admin/main';

describe('mountAdminApp', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '<div id="root"></div>';
    sessionStorage.removeItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY);
    resetAdminTableSelectionForTests();
    vi.mocked(resolveAtHandleToDid).mockReset();
    vi.mocked(searchActorsTypeahead).mockReset();
    fetchMock = vi.fn();
    let callIdx = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/admin/session/v1/options')) {
        return {
          ok: true,
          json: async () => ({ passwordLogin: true }),
        };
      }
      if (String(url).includes('/admin/session/v1/login')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'session.jwt.here' }),
        };
      }
      if (String(url).includes('/admin/allowlist/v1')) {
        const u = String(url);
        const isList =
          u.endsWith('/admin/allowlist/v1') && !u.includes('/add') && !u.includes('/remove');
        if (isList) {
          callIdx += 1;
          return {
            ok: true,
            json: async () => ({
              version: callIdx,
              adminHandle: ADMIN_UI_HANDLE,
              entries: [{ did: 'did:plc:a', handle: 'a.test' }],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            entries: [
              { did: 'did:plc:a', handle: 'a.test' },
              { did: 'did:plc:bob', handle: 'bob.test' },
            ],
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders password sign-in when there is no session JWT', async () => {
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('Enter the admin password');
    expect(fetchMock).toHaveBeenCalledWith('https://relay.test/admin/session/v1/options');
  });

  it('shows relay message when password login is not enabled on relay', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/options')) {
        return { ok: true, json: async () => ({ passwordLogin: false }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('ATDANCE_ADMIN_PASSWORD');
  });

  it('submits password and stores session JWT', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const pw = root.querySelector('input[type=password]') as HTMLInputElement;
    pw.value = 'secret';
    const btn = root.querySelector('button.al-btn--primary') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'https://relay.test/admin/session/v1/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'secret' }),
        }),
      ),
    );
    await vi.waitFor(() =>
      expect(setItem).toHaveBeenCalledWith(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'session.jwt.here'),
    );
    setItem.mockRestore();
  });

  it('renders allowlist shell when session JWT is present', async () => {
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'fake.jwt.token');
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    expect(root.textContent).toContain('Remove selected');
    expect(root.textContent).toContain('did:plc:a');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.test/admin/allowlist/v1',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const hdrs = fetchMock.mock.calls.find(
      (c) => typeof c[0] === 'string' && String(c[0]).endsWith('/admin/allowlist/v1'),
    )?.[1]?.headers as Headers;
    expect(hdrs.get('Authorization')).toBe('Bearer fake.jwt.token');
  });

  it('shows incorrect password when login returns 401', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/options')) {
        return { ok: true, json: async () => ({ passwordLogin: true }) };
      }
      if (String(url).includes('/login')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'invalid_credentials' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    const pw = root.querySelector('input[type=password]') as HTMLInputElement;
    pw.value = 'wrong';
    (root.querySelector('button.al-btn--primary') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.textContent).toContain('Incorrect password'));
  });

  it('shows relay auth reason when allowlist GET returns 403 with JSON body', async () => {
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'x');
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/options')) {
        return { ok: true, json: async () => ({ passwordLogin: true }) };
      }
      if (String(url).includes('/allowlist/v1') && !String(url).includes('/add')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: 'admin_auth_failed', reason: 'forbidden' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const root = document.getElementById('root')!;
    await mountAdminApp(root);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Not authorized (admin only)');
      expect(root.textContent).toContain('does not match the DID for the configured admin handle');
    });
  });

  it('runs typeahead after @ input (debounced)', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'x');
    vi.mocked(searchActorsTypeahead).mockResolvedValue([{ did: 'did:plc:s', handle: 's.test' }]);
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
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'x');
    vi.mocked(resolveAtHandleToDid).mockImplementation(async (h: string) => {
      if (h === 'bob.test') {
        return 'did:plc:bob';
      }
      return null;
    });
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
    sessionStorage.setItem(ATDANCE_RELAY_ADMIN_SESSION_JWT_KEY, 'x');
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/options')) {
        return { ok: true, json: async () => ({ passwordLogin: true }) };
      }
      if (
        String(url).includes('/allowlist/v1') &&
        !String(url).includes('/add') &&
        !String(url).includes('/remove')
      ) {
        return {
          ok: true,
          json: async () => ({
            version: 1,
            adminHandle: ADMIN_UI_HANDLE,
            entries: [{ did: 'did:plc:row', handle: 'r' }],
          }),
        };
      }
      if (String(url).includes('/remove')) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
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
