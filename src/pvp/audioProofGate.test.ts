import { describe, expect, it } from 'vitest';

import { offsetMsFromNtpExchange } from '@/pvp/audioProofGate';

describe('audioProofGate', () => {
  it('delegates to ntp offset', () => {
    expect(offsetMsFromNtpExchange(0, 50, 50, 100)).toBe(0);
  });
});
