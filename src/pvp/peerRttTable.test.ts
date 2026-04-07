import { describe, expect, it } from 'vitest';

import { PeerRttTable } from '@/pvp/peerRttTable';

describe('PeerRttTable', () => {
  it('sorts by best RTT', () => {
    const t = new PeerRttTable(3600_000);
    let now = 1_000_000;
    t.recordSample('did:plc:a', 100, 5, now);
    now += 1;
    t.recordSample('did:plc:b', 50, 2, now);
    const s = t.sortedByBestRtt();
    expect(s[0]?.did).toBe('did:plc:b');
    expect(s[1]?.did).toBe('did:plc:a');
  });

  it('refreshes TTL on new sample', () => {
    const t = new PeerRttTable(1000);
    t.recordSample('did:plc:x', 80, 1, 0);
    t.recordSample('did:plc:x', 80, 1, 2000);
    expect(t.sortedByBestRtt().length).toBe(1);
  });
});
