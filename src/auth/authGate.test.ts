import type { OAuthSession } from '@atproto/oauth-client-browser';
import { describe, expect, it } from 'vitest';

import { canPlay } from '@/auth/authGate';

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
