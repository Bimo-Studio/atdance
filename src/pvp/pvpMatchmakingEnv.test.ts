import { describe, expect, it } from 'vitest';

import { isPvpMatchmakingConfiguredFrom } from '@/pvp/pvpMatchmakingEnv';

describe('isPvpMatchmakingConfiguredFrom', () => {
  const base = {
    relayUrl: '',
    e2eMode: false,
    vitePvpP2pProbe: '' as string | undefined,
    p2pBootstrapOk: false,
  };

  it('is true in e2e mode regardless of relay', () => {
    expect(
      isPvpMatchmakingConfiguredFrom({
        ...base,
        e2eMode: true,
      }),
    ).toBe(true);
  });

  it('is true with relay URL', () => {
    expect(
      isPvpMatchmakingConfiguredFrom({
        ...base,
        relayUrl: 'wss://r.example/ws',
      }),
    ).toBe(true);
  });

  it('is true with VITE_PVP_P2P_PROBE=1 string or boolean', () => {
    expect(
      isPvpMatchmakingConfiguredFrom({
        ...base,
        vitePvpP2pProbe: '1',
      }),
    ).toBe(true);
    expect(
      isPvpMatchmakingConfiguredFrom({
        ...base,
        vitePvpP2pProbe: true,
      }),
    ).toBe(true);
  });

  it('is true with P2P bootstrap', () => {
    expect(
      isPvpMatchmakingConfiguredFrom({
        ...base,
        p2pBootstrapOk: true,
      }),
    ).toBe(true);
  });

  it('is false when all off', () => {
    expect(isPvpMatchmakingConfiguredFrom(base)).toBe(false);
  });
});
