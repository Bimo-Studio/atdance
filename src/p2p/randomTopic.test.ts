import { describe, expect, it } from 'vitest';

import { randomTopicHex } from '@/p2p/randomTopic';

describe('P3.4 randomTopicHex', () => {
  it('returns requested byte length as hex (2 chars per byte)', () => {
    expect(randomTopicHex(8)).toHaveLength(16);
    expect(randomTopicHex(16)).toHaveLength(32);
  });

  it('produces different values across calls (probabilistic)', () => {
    const a = new Set<string>();
    for (let i = 0; i < 20; i++) {
      a.add(randomTopicHex(8));
    }
    expect(a.size).toBeGreaterThan(1);
  });

  it('is hex only', () => {
    expect(randomTopicHex(4)).toMatch(/^[0-9a-f]+$/);
  });
});
