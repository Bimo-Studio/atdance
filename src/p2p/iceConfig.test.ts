import { describe, expect, it } from 'vitest';

import { buildIceServers, DEFAULT_PUBLIC_STUN_URLS } from '@/p2p/iceConfig';

describe('P1.3 iceConfig', () => {
  it('includes default public STUN entries', () => {
    const ice = buildIceServers({});
    expect(ice.length).toBeGreaterThanOrEqual(2);
    expect(ice[0]).toEqual({ urls: DEFAULT_PUBLIC_STUN_URLS[0] });
    expect(ice[1]).toEqual({ urls: DEFAULT_PUBLIC_STUN_URLS[1] });
  });

  it('appends extra STUN urls as a single entry', () => {
    const ice = buildIceServers({ extraUrls: ['stun:custom:3478'] });
    const last = ice[ice.length - 1];
    expect(last).toEqual({ urls: ['stun:custom:3478'] });
  });

  it('merges TURN when provided (P3 shape)', () => {
    const ice = buildIceServers({
      turn: [
        {
          urls: 'turn:turn.example:3478',
          username: 'u',
          credential: 'p',
        },
      ],
    });
    expect(ice.some((e) => 'credential' in e && e.credential === 'p')).toBe(true);
  });

  it('throws on malformed TURN', () => {
    expect(() =>
      buildIceServers({
        turn: [{ urls: 123 } as unknown as { urls: string }],
      }),
    ).toThrow(/Invalid TURN config/i);
  });
});
