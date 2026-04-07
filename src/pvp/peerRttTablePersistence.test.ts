import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { loadPeerRttTableForDid, savePeerRttTableForDid } from '@/pvp/peerRttTablePersistence';
import { PeerRttTable } from '@/pvp/peerRttTable';

describe('peerRttTablePersistence', () => {
  it('round-trips entries for a DID', async () => {
    const did = 'did:plc:testpeer';
    const t = new PeerRttTable(3600_000);
    t.recordSample('did:plc:remote', 90, 5, 1_000_000);
    await savePeerRttTableForDid(did, t);

    const t2 = await loadPeerRttTableForDid(did, 1_000_001);
    const s = t2.sortedByBestRtt();
    expect(s).toHaveLength(1);
    expect(s[0]?.did).toBe('did:plc:remote');
    expect(s[0]?.bestRttMs).toBe(90);
  });
});
