import { describe, expect, it } from 'vitest';

import { MockProbeTransport } from '@/pvp/probeTransport';

describe('MockProbeTransport', () => {
  it('returns fixed RTT', async () => {
    const m = new MockProbeTransport({ fixedMs: 42 });
    const s = await m.collectRttSamples('did:plc:x', 5);
    expect(s).toEqual([42, 42, 42, 42, 42]);
  });

  it('uses explicit sample list', async () => {
    const m = new MockProbeTransport({ samples: [1, 2, 3] });
    const s = await m.collectRttSamples('did:plc:x', 5);
    expect(s).toEqual([1, 2, 3, 3, 3]);
  });
});
