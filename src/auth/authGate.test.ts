import type { OAuthSession } from '@atproto/oauth-client-browser';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { canPlay, canPlayAsync } from '@/auth/authGate';

function mockSession(sub: string): OAuthSession {
  return { sub } as OAuthSession;
}

describe('canPlay', () => {
  it('returns false for null', () => {
    expect(canPlay(null)).toBe(false);
  });

  it('returns false when sub is not a DID', () => {
    expect(canPlay(mockSession('not-a-did'))).toBe(false);
  });

  it('returns true for did when invite mode off', () => {
    expect(canPlay(mockSession('did:plc:abc'))).toBe(true);
  });

  it('when invite only, requires allowlist', () => {
    const env = {
      VITE_INVITE_ONLY: '1',
      VITE_ATPROTO_ALLOWLIST_DIDS: 'did:plc:allowed,did:plc:two',
    };
    expect(canPlay(mockSession('did:plc:allowed'), env)).toBe(true);
    expect(canPlay(mockSession('did:plc:other'), env)).toBe(false);
  });

  it('trims allowlist entries and rejects unknown DID', () => {
    const env = {
      VITE_INVITE_ONLY: '1',
      VITE_ATPROTO_ALLOWLIST_DIDS: ' did:plc:trimmed , ',
    };
    expect(canPlay(mockSession('did:plc:trimmed'), env)).toBe(true);
    expect(canPlay(mockSession('did:plc:x'), env)).toBe(false);
  });

  it('invite mode with empty allowlist denies all DIDs', () => {
    const env = {
      VITE_INVITE_ONLY: '1',
      VITE_ATPROTO_ALLOWLIST_DIDS: '',
    };
    expect(canPlay(mockSession('did:plc:any'), env)).toBe(false);
  });
});

describe('canPlayAsync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to env allowlist when relay origin missing', async () => {
    const env = {
      VITE_INVITE_ONLY: '1',
      VITE_ATPROTO_ALLOWLIST_DIDS: 'did:plc:ok',
      VITE_RELAY_WS: '',
      VITE_RELAY_HTTP: '',
    };
    expect(await canPlayAsync(mockSession('did:plc:ok'), env)).toBe(true);
    expect(await canPlayAsync(mockSession('did:plc:nope'), env)).toBe(false);
  });

  it('uses relay check when origin is set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ allowed: true }),
      }),
    );
    const env = {
      VITE_INVITE_ONLY: '1',
      VITE_ATPROTO_ALLOWLIST_DIDS: '',
      VITE_RELAY_WS: 'wss://relay.test/x',
      VITE_RELAY_HTTP: '',
    };
    expect(await canPlayAsync(mockSession('did:plc:x'), env)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://relay.test/x/allowlist/v1/check?did=did%3Aplc%3Ax',
      expect.anything(),
    );
  });
});
