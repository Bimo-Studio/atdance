/**
 * IndexedDB cache for decoded audio bytes (plan Phase 2.2).
 */
import 'fake-indexeddb/auto';

import { clear, get } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/audio/audioFetchMain', () => ({
  fetchAudioArrayBufferForDecode: vi.fn(),
}));

vi.mock('@/audio/decodeAudio', () => ({
  decodeAudioArrayBuffer: vi.fn(),
}));

import { fetchAudioArrayBufferForDecode } from '@/audio/audioFetchMain';
import { decodeAudioArrayBuffer } from '@/audio/decodeAudio';

import { decodeAudioFromUrlCached } from './fetchCached';

describe('decodeAudioFromUrlCached', () => {
  const raw = new Uint8Array([1, 2, 3, 4]).buffer;

  beforeEach(async () => {
    await clear();
    vi.mocked(fetchAudioArrayBufferForDecode).mockReset();
    vi.mocked(decodeAudioArrayBuffer).mockReset();
  });

  it('stores raw bytes in IndexedDB and skips fetch on second call', async () => {
    vi.mocked(fetchAudioArrayBufferForDecode).mockResolvedValue(raw.slice(0));
    const fakeBuf = { duration: 1 } as AudioBuffer;
    vi.mocked(decodeAudioArrayBuffer).mockResolvedValue(fakeBuf);

    const ctx = {} as AudioContext;
    const url = 'https://cdn.example/songs/a/a.ogg';

    const first = await decodeAudioFromUrlCached(ctx, url);
    expect(first).toBe(fakeBuf);
    expect(fetchAudioArrayBufferForDecode).toHaveBeenCalledTimes(1);
    expect(decodeAudioArrayBuffer).toHaveBeenCalledTimes(1);

    const second = await decodeAudioFromUrlCached(ctx, url);
    expect(second).toBe(fakeBuf);
    expect(fetchAudioArrayBufferForDecode).toHaveBeenCalledTimes(1);
    expect(decodeAudioArrayBuffer).toHaveBeenCalledTimes(2);

    const stored = await get<ArrayBuffer>(`v1:buf:${url}`);
    expect(stored).toBeDefined();
    expect(stored?.byteLength).toBe(raw.byteLength);
  });
});
