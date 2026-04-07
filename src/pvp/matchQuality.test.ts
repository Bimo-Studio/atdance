import { describe, expect, it } from 'vitest';

import { evaluateMatchQuality } from '@/pvp/matchQuality';

function samples(n: number, ms: number): number[] {
  return Array.from({ length: n }, () => ms);
}

describe('evaluateMatchQuality', () => {
  it('rejects too few samples', () => {
    expect(evaluateMatchQuality([80, 90])).toEqual({ accept: false, reason: 'too_few_samples' });
  });

  it('accepts at exactly minSamples (PRD §6 default 5)', () => {
    const s = samples(5, 80);
    expect(evaluateMatchQuality(s).accept).toBe(true);
  });

  it('accepts low mean stable path', () => {
    const s = samples(10, 80);
    expect(evaluateMatchQuality(s).accept).toBe(true);
  });

  it('rejects high mean', () => {
    const s = samples(10, 170);
    expect(evaluateMatchQuality(s)).toEqual({ accept: false, reason: 'rtt_mean' });
  });

  it('rejects high jitter', () => {
    const s = [0, 100, 0, 100, 0, 100, 0, 100, 0, 100];
    expect(evaluateMatchQuality(s).reason).toBe('jitter');
  });

  /** PRD §6 defaults: accept mean ≤120ms */
  it('accepts mean at 120ms with stable samples', () => {
    const s = samples(10, 120);
    expect(evaluateMatchQuality(s).accept).toBe(true);
  });

  /** Soft tier: 120–160ms mean allowed only if jitter ≤25ms */
  it('soft tier accepts 140ms mean with low jitter', () => {
    const s = samples(10, 140);
    expect(evaluateMatchQuality(s).accept).toBe(true);
  });

  it('soft tier rejects 140ms mean with high jitter', () => {
    const s = [100, 180, 100, 180, 100, 180, 100, 180, 100, 180];
    expect(evaluateMatchQuality(s).accept).toBe(false);
    expect(evaluateMatchQuality(s).reason).toBe('jitter');
  });

  /** p95 > 200ms → reject (implementation uses sorted[floor(0.95*(n-1))]) */
  it('rejects when p95 exceeds 200ms even if mean is OK', () => {
    const s = [...samples(18, 80), 250, 250];
    expect(evaluateMatchQuality(s)).toEqual({ accept: false, reason: 'rtt_p95' });
  });

  it('rejects empty sample list', () => {
    expect(evaluateMatchQuality([])).toEqual({ accept: false, reason: 'too_few_samples' });
  });
});
