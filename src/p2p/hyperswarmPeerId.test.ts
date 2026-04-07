import { describe, expect, it } from 'vitest';

import { peerIdFromHyperswarmDetails } from '@/p2p/hyperswarmPeerId';

describe('peerIdFromHyperswarmDetails', () => {
  it('reads peer.host from hyperswarm-web-style details', () => {
    expect(peerIdFromHyperswarmDetails({ peer: { host: 'abc123' } })).toBe('abc123');
  });

  it('returns empty string when missing', () => {
    expect(peerIdFromHyperswarmDetails({})).toBe('');
    expect(peerIdFromHyperswarmDetails(null)).toBe('');
  });
});
