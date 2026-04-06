import { describe, expect, it } from 'vitest';

import { allowJoinForIp, createJoinRateState, type JoinRateState } from './rateLimit';

describe('allowJoinForIp (plan Phase 4.4)', () => {
  it('allows up to max joins per window', () => {
    let s: JoinRateState = createJoinRateState();
    const ip = '1.2.3.4';
    const windowMs = 60_000;
    const max = 3;

    for (let i = 0; i < max; i += 1) {
      const r = allowJoinForIp(s, ip, 1000 + i * 1000, max, windowMs);
      expect(r.allowed).toBe(true);
      s = r.state;
    }
    const denied = allowJoinForIp(s, ip, 1000 + max * 1000, max, windowMs);
    expect(denied.allowed).toBe(false);
  });

  it('resets after the window elapses', () => {
    let s = createJoinRateState();
    const ip = '9.9.9.9';
    const windowMs = 1000;
    s = allowJoinForIp(s, ip, 0, 2, windowMs).state;
    s = allowJoinForIp(s, ip, 500, 2, windowMs).state;
    expect(allowJoinForIp(s, ip, 600, 2, windowMs).allowed).toBe(false);
    const after = allowJoinForIp(s, ip, 2000, 2, windowMs);
    expect(after.allowed).toBe(true);
  });
});
