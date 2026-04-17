import { describe, expect, it } from 'vitest';

import { formatAccountFooterLine } from './accountDisplay';

describe('formatAccountFooterLine', () => {
  it('uses @handle when resolved', () => {
    expect(formatAccountFooterLine('did:plc:abc', 'user.bsky.social')).toBe(
      'Account: @user.bsky.social',
    );
  });

  it('strips leading @ from handle', () => {
    expect(formatAccountFooterLine('did:plc:abc', '@user.bsky.social')).toBe(
      'Account: @user.bsky.social',
    );
  });

  it('falls back to shortened DID when handle is null', () => {
    const long =
      'did:plc:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    expect(formatAccountFooterLine(long, null)).toMatch(/^Account: did:plc:xxxxxxxx/);
    expect(formatAccountFooterLine(long, null)).toContain('…');
  });

  it('uses full short DID when under length threshold', () => {
    expect(formatAccountFooterLine('did:web:example', null)).toBe('Account: did:web:example');
  });
});
