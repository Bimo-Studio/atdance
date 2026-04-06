import { describe, expect, it } from 'vitest';

import { formatP2PSyncLabUserError } from '@/p2p/p2pSyncLabErrors';

describe('P1.2 formatP2PSyncLabUserError', () => {
  it('bootstrap_missing mentions VITE_P2P_BOOTSTRAP', () => {
    expect(formatP2PSyncLabUserError('bootstrap_missing', { dev: true })).toMatch(
      /VITE_P2P_BOOTSTRAP/i,
    );
    expect(formatP2PSyncLabUserError('bootstrap_missing', { dev: false })).toMatch(
      /VITE_P2P_BOOTSTRAP/i,
    );
  });

  it('ice_failed mentions ICE / WebRTC', () => {
    const s = formatP2PSyncLabUserError('ice_failed', { dev: true });
    expect(s).toMatch(/ICE|WebRTC/i);
  });

  it('peer_timeout mentions peer / topic', () => {
    expect(formatP2PSyncLabUserError('peer_timeout', { dev: false })).toMatch(/peer|topic/i);
  });
});
