/**
 * Device id for anonymous local rows (plan Phase 3.4).
 */
import 'fake-indexeddb/auto';

import { clear, get } from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrCreateDeviceId } from './deviceId';

describe('getOrCreateDeviceId', () => {
  beforeEach(async () => {
    await clear();
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and reuses a UUID in IndexedDB', async () => {
    const first = await getOrCreateDeviceId();
    expect(first).toBe('11111111-1111-4111-8111-111111111111');
    expect(await get<string>('atdance.deviceId.v1')).toBe(first);
    const second = await getOrCreateDeviceId();
    expect(second).toBe(first);
  });
});
