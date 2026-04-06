import { describe, expect, it } from 'vitest';

import { DEFAULT_TORRENT_HTTP_FALLBACK, playDataFromMagnet } from './torrentPlayData';

describe('playDataFromMagnet', () => {
  it('includes magnet, HTTP fallback chart, and timeout', () => {
    const m = 'magnet:?xt=urn:btih:abc';
    const d = playDataFromMagnet(m, 12000);
    expect(d.magnetUri).toBe(m);
    expect(d.torrentTimeoutMs).toBe(12000);
    expect(d.chartUrl).toBe(DEFAULT_TORRENT_HTTP_FALLBACK.chartUrl);
    expect(d.chartIndex).toBe(DEFAULT_TORRENT_HTTP_FALLBACK.chartIndex);
  });
});
