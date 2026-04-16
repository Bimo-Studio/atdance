import { describe, expect, it } from 'vitest';

import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

describe('relayHttpOriginFromEnv', () => {
  it('uses explicit VITE_RELAY_HTTP', () => {
    expect(
      relayHttpOriginFromEnv({
        VITE_RELAY_HTTP: 'https://relay.example.com/foo/',
        VITE_RELAY_WS: '',
      }),
    ).toBe('https://relay.example.com/foo');
  });

  it('derives from wss', () => {
    expect(
      relayHttpOriginFromEnv({
        VITE_RELAY_HTTP: '',
        VITE_RELAY_WS: 'wss://r.test/ws',
      }),
    ).toBe('https://r.test/ws');
  });

  it('returns null when unset', () => {
    expect(relayHttpOriginFromEnv({ VITE_RELAY_HTTP: '', VITE_RELAY_WS: '' })).toBeNull();
  });
});
