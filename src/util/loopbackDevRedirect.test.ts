import { describe, expect, it } from 'vitest';

import { loopbackUrlFromLocalhost } from './loopbackDevRedirect';

describe('loopbackUrlFromLocalhost', () => {
  it('maps localhost to 127.0.0.1 preserving port and path', () => {
    expect(loopbackUrlFromLocalhost('http://localhost:5173/')).toBe('http://127.0.0.1:5173/');
    expect(loopbackUrlFromLocalhost('http://localhost:9/play')).toBe('http://127.0.0.1:9/play');
  });

  it('returns null when already on loopback IP or non-localhost', () => {
    expect(loopbackUrlFromLocalhost('http://127.0.0.1:5173/')).toBeNull();
    expect(loopbackUrlFromLocalhost('https://example.com/')).toBeNull();
  });
});
