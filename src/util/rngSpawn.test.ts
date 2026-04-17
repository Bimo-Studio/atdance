import { describe, expect, it } from 'vitest';

import { mulberry32, spawnDelayMs } from '@/util/rngSpawn';

describe('mulberry32', () => {
  it('is deterministic for a fixed seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('spawnDelayMs', () => {
  it('returns min when rng is 0', () => {
    expect(spawnDelayMs(() => 0, 100, 200)).toBe(100);
  });

  it('returns max when rng approaches 1', () => {
    expect(spawnDelayMs(() => 0.999999, 10, 12)).toBe(12);
  });

  it('throws when max < min', () => {
    expect(() => spawnDelayMs(() => 0.5, 5, 3)).toThrow(RangeError);
  });
});
