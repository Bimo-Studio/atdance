/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/admin/main', () => ({
  mountAdminApp: vi.fn().mockResolvedValue(undefined),
}));

import { mountAdminApp } from '@/admin/main';
import { runAdminEntrypoint } from '@/admin/entrypoint';

describe('runAdminEntrypoint', () => {
  beforeEach(() => {
    vi.mocked(mountAdminApp).mockClear();
    document.body.innerHTML = '';
  });

  it('mounts when #root exists', () => {
    document.body.innerHTML = '<div id="root"></div>';
    runAdminEntrypoint();
    expect(mountAdminApp).toHaveBeenCalledTimes(1);
    expect(mountAdminApp).toHaveBeenCalledWith(document.getElementById('root'));
  });

  it('no-ops when #root is missing', () => {
    runAdminEntrypoint();
    expect(mountAdminApp).not.toHaveBeenCalled();
  });

  it('uses injected document', () => {
    const getElementById = vi.fn().mockReturnValue(null);
    runAdminEntrypoint({ getElementById });
    expect(getElementById).toHaveBeenCalledWith('root');
    expect(mountAdminApp).not.toHaveBeenCalled();
  });

  it('appends an error when mountAdminApp rejects', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById('root')!;
    vi.mocked(mountAdminApp).mockRejectedValueOnce(new Error('boom'));
    const logErr = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    try {
      runAdminEntrypoint();
      await vi.waitFor(() =>
        expect(root.querySelector('[role="alert"]')?.textContent).toBe('boom'),
      );
    } finally {
      logErr.mockRestore();
    }
  });
});
