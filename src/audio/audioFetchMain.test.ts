import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('fetchAudioArrayBufferForDecode', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new Uint8Array([9, 9]).buffer),
      }),
    );
    vi.stubGlobal('Worker', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses main-thread fetch when Worker is undefined', async () => {
    const { fetchAudioArrayBufferForDecode } = await import('./audioFetchMain');
    const buf = await fetchAudioArrayBufferForDecode('https://example.com/a.ogg');
    expect(buf.byteLength).toBe(2);
    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/a.ogg');
  });
});
