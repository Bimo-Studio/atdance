import { describe, expect, it } from 'vitest';

import { safeIceFailureLabel } from '@/p2p/p2pTelemetry';

describe('P3.2 safeIceFailureLabel', () => {
  it('strips non-alphanumeric noise', () => {
    expect(safeIceFailureLabel('failed (STUN 401)')).toBe('ice_failure:failed STUN 401');
  });

  it('truncates long reasons', () => {
    const long = 'x'.repeat(200);
    expect(safeIceFailureLabel(long).length).toBeLessThanOrEqual(64 + 'ice_failure:'.length);
  });

  it('handles empty after strip', () => {
    expect(safeIceFailureLabel('@@@')).toBe('ice_failure:unknown');
  });
});
