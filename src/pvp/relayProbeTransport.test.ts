import { describe, expect, it } from 'vitest';

import type { PvpRelaySession } from '@/pvp/pvpRelaySession';
import type { PvpMessageV1 } from '@/pvp/pvpMessageV1';

import { RelayProbeTransport, tryRespondToPvpProbe } from './relayProbeTransport';

function linkedRelaySessions(): [PvpRelaySession, PvpRelaySession] {
  let hA: ((m: PvpMessageV1) => void) | null = null;
  let hB: ((m: PvpMessageV1) => void) | null = null;

  const deliver = (to: 'a' | 'b', m: PvpMessageV1): void => {
    queueMicrotask(() => {
      if (to === 'a') {
        hA?.(m);
      } else {
        hB?.(m);
      }
    });
  };

  const sA: PvpRelaySession = {
    close: () => undefined,
    getRoomId: () => 'room',
    sendPvp: (m) => deliver('b', m),
    setOnPvpMessage: (h) => {
      hA = h;
    },
  };

  const sB: PvpRelaySession = {
    close: () => undefined,
    getRoomId: () => 'room',
    sendPvp: (m) => deliver('a', m),
    setOnPvpMessage: (h) => {
      hB = h;
    },
  };

  return [sA, sB];
}

describe('tryRespondToPvpProbe', () => {
  it('returns false for non-probe messages', () => {
    const sent: PvpMessageV1[] = [];
    const session = { sendPvp: (m: PvpMessageV1) => sent.push(m) };
    expect(tryRespondToPvpProbe(session, { type: 'pvp.v1.chartAck', chartUrl: '/x.dance' })).toBe(
      false,
    );
    expect(sent).toEqual([]);
  });

  it('sends probeAck and returns true for probe', () => {
    const sent: PvpMessageV1[] = [];
    const session = { sendPvp: (m: PvpMessageV1) => sent.push(m) };
    expect(
      tryRespondToPvpProbe(session, { type: 'pvp.v1.probe', id: 'p1', t1: 1_700_000_000 }),
    ).toBe(true);
    expect(sent).toEqual([
      {
        type: 'pvp.v1.probeAck',
        id: 'p1',
        t1: 1_700_000_000,
        t2: expect.any(Number) as number,
      },
    ]);
  });
});

describe('RelayProbeTransport', () => {
  it('collects RTT samples via relay-shaped message path', async () => {
    const [sA, sB] = linkedRelaySessions();
    const ta = new RelayProbeTransport(sA);
    const tb = new RelayProbeTransport(sB);

    const [aSamples, bSamples] = await Promise.all([
      ta.collectRttSamples('did:plc:a', 5),
      tb.collectRttSamples('did:plc:b', 5),
    ]);

    expect(aSamples).toHaveLength(5);
    expect(bSamples).toHaveLength(5);
    for (const s of aSamples) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2000);
    }
  });
});
