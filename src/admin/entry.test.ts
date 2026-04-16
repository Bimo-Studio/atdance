import { describe, expect, it, vi } from 'vitest';

vi.mock('@/admin/entrypoint', () => ({
  runAdminEntrypoint: vi.fn(),
}));

import { runAdminEntrypoint } from '@/admin/entrypoint';

describe('admin entry', () => {
  it('calls runAdminEntrypoint when the entry module loads', async () => {
    await import('@/admin/entry');
    expect(vi.mocked(runAdminEntrypoint)).toHaveBeenCalledTimes(1);
  });
});
