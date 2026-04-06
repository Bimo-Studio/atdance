/**
 * IndexedDB roundtrip for chart cache (plan Phase 2.2).
 * Requires `fake-indexeddb` so Vitest (Node) exposes indexedDB.
 */
import 'fake-indexeddb/auto';

import { clear, get } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchChartTextCached } from './fetchCached';

describe('fetchChartTextCached', () => {
  beforeEach(async () => {
    await clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('writes fetched text to IndexedDB and skips fetch on second call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'chart body',
    });
    vi.stubGlobal('fetch', fetchMock);

    const url = '/fixture/test.dance';
    const first = await fetchChartTextCached(url);
    expect(first).toBe('chart body');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await fetchChartTextCached(url);
    expect(second).toBe('chart body');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const stored = await get<string>(`v1:text:${url}`);
    expect(stored).toBe('chart body');
  });
});
