import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getPvpRelayWsUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('prefers VITE_RELAY_WS when set', async () => {
    vi.stubEnv('VITE_RELAY_WS', 'wss://relay.example/ws');
    const { getPvpRelayWsUrl } = await import('@/pvp/pvpRelayQueue');
    expect(getPvpRelayWsUrl()).toBe('wss://relay.example/ws');
  });

  it('uses local relay default in dev when VITE_RELAY_WS unset', async () => {
    vi.stubEnv('VITE_RELAY_WS', '');
    const { getPvpRelayWsUrl } = await import('@/pvp/pvpRelayQueue');
    if (import.meta.env.DEV) {
      expect(getPvpRelayWsUrl()).toBe('ws://127.0.0.1:8787');
    } else {
      expect(getPvpRelayWsUrl()).toBe('');
    }
  });
});
