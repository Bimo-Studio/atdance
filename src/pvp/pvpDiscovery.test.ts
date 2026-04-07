import { afterEach, describe, expect, it, vi } from 'vitest';

describe('isP2PBootstrapConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is false when bootstrap env is empty', async () => {
    vi.stubEnv('VITE_P2P_BOOTSTRAP', '');
    const { isP2PBootstrapConfigured } = await import('@/pvp/pvpDiscovery');
    expect(isP2PBootstrapConfigured()).toBe(false);
  });

  it('is true when bootstrap parses to WS URLs', async () => {
    vi.stubEnv('VITE_P2P_BOOTSTRAP', 'wss://example.com/p');
    const { isP2PBootstrapConfigured } = await import('@/pvp/pvpDiscovery');
    expect(isP2PBootstrapConfigured()).toBe(true);
  });
});
