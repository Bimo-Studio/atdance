import { describe, expect, it } from 'vitest';

import { formatRelayLogLine } from './relayLogPayload';

describe('formatRelayLogLine', () => {
  it('includes svc and evt and no IP keys', () => {
    const line = formatRelayLogLine({
      evt: 'match_probe',
      traceId: 't1',
      playerDid: 'did:plc:abc',
      decision: 'accept',
    });
    const o = JSON.parse(line) as Record<string, string>;
    expect(o.svc).toBe('relay');
    expect(o.evt).toBe('match_probe');
    expect(o.playerDid).toBe('did:plc:abc');
    expect('ip' in o).toBe(false);
    expect('CF-Connecting-IP' in o).toBe(false);
  });

  it('supports §9 match_probe fields', () => {
    const line = formatRelayLogLine({
      evt: 'match_probe',
      traceId: 't2',
      phase: 'probe',
      matchId: 'room-0',
      localDid: 'did:plc:a',
      remoteDid: 'did:plc:b',
      rttMeanMs: 88,
      rttP95Ms: 112,
      jitterStdMs: 18,
      decision: 'accept',
    });
    const o = JSON.parse(line) as Record<string, unknown>;
    expect(o.matchId).toBe('room-0');
    expect(o.rttMeanMs).toBe(88);
    expect(o.decision).toBe('accept');
  });
});
