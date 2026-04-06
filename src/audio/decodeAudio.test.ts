import { describe, expect, it, vi } from 'vitest';

import { decodeAudioArrayBuffer, decodeAudioFromUrl } from './decodeAudio';

describe('decodeAudioArrayBuffer', () => {
  it('calls AudioContext.decodeAudioData with buffer', async () => {
    const decode = vi.fn().mockResolvedValue({ duration: 1 } as AudioBuffer);
    const ctx = { decodeAudioData: decode } as unknown as AudioContext;
    const ab = new ArrayBuffer(8);
    await decodeAudioArrayBuffer(ctx, ab);
    expect(decode).toHaveBeenCalledTimes(1);
  });
});

describe('decodeAudioFromUrl', () => {
  it('fetches then decodes', async () => {
    const raw = new ArrayBuffer(4);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => raw,
      }),
    );
    const decode = vi.fn().mockResolvedValue({ duration: 0.1 } as AudioBuffer);
    const ctx = { decodeAudioData: decode } as unknown as AudioContext;
    await decodeAudioFromUrl(ctx, 'https://x/a.ogg');
    expect(decode).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
