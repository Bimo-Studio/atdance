import { describe, expect, it } from 'vitest';

import { parseRelayInviteEnv } from './inviteAllowlist';

describe('parseRelayInviteEnv', () => {
  it('invite off by default', () => {
    const c = parseRelayInviteEnv({});
    expect(c.inviteOnly).toBe(false);
    expect(c.allowedDids.size).toBe(0);
  });

  it('parses allowlist', () => {
    const c = parseRelayInviteEnv({
      INVITE_ONLY: '1',
      ATPROTO_ALLOWLIST_DIDS: 'did:plc:a, did:plc:b',
    });
    expect(c.inviteOnly).toBe(true);
    expect(c.allowedDids.has('did:plc:a')).toBe(true);
    expect(c.allowedDids.has('did:plc:b')).toBe(true);
  });
});
