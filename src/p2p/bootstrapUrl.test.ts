import { describe, expect, it } from 'vitest';

import { parseViteP2PBootstrap } from '@/p2p/bootstrapUrl';

describe('P0.2 parseViteP2PBootstrap', () => {
  it('rejects undefined / empty as MISSING', () => {
    expect(parseViteP2PBootstrap(undefined)).toEqual({
      ok: false,
      code: 'MISSING',
      message: 'VITE_P2P_BOOTSTRAP is not set or empty.',
    });
    expect(parseViteP2PBootstrap('')).toEqual({
      ok: false,
      code: 'MISSING',
      message: 'VITE_P2P_BOOTSTRAP is not set or empty.',
    });
    expect(parseViteP2PBootstrap('   ')).toEqual({
      ok: false,
      code: 'MISSING',
      message: 'VITE_P2P_BOOTSTRAP is not set or empty.',
    });
  });

  it('parses comma-separated wss:// and ws:// URLs', () => {
    expect(parseViteP2PBootstrap('wss://a.example/proxy, ws://127.0.0.1:4977/proxy ')).toEqual({
      ok: true,
      urls: ['wss://a.example/proxy', 'ws://127.0.0.1:4977/proxy'],
    });
  });

  it('parses JSON array form', () => {
    expect(parseViteP2PBootstrap('["wss://x.example/p","ws://127.0.0.1:4977/p"]')).toEqual({
      ok: true,
      urls: ['wss://x.example/p', 'ws://127.0.0.1:4977/p'],
    });
  });

  it('rejects JSON object (must be array)', () => {
    const r = parseViteP2PBootstrap('{"0":"wss://x"}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('INVALID');
      expect(r.message).toMatch(/array/i);
    }
  });

  it('rejects https URLs and invalid strings', () => {
    expect(parseViteP2PBootstrap('https://wrong.example').ok).toBe(false);
    expect(parseViteP2PBootstrap('not-a-url').ok).toBe(false);
  });

  it('rejects bad JSON', () => {
    const r = parseViteP2PBootstrap('[wss://oops');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('INVALID');
  });
});
