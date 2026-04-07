import { Buffer } from 'buffer';

import { describe, expect, it } from 'vitest';

import { sha256TopicKey } from '@/p2p/topicKey';

describe('sha256TopicKey', () => {
  it('returns 32-byte SHA-256 of UTF-8 label', async () => {
    const a = await sha256TopicKey('atdance-sync-lab');
    const b = await sha256TopicKey('atdance-sync-lab');
    expect(a.length).toBe(32);
    expect(Buffer.from(a).toString('hex')).toBe(Buffer.from(b).toString('hex'));
  });

  it('differs for different labels', async () => {
    const a = await sha256TopicKey('a');
    const b = await sha256TopicKey('b');
    expect(Buffer.from(a).toString('hex')).not.toBe(Buffer.from(b).toString('hex'));
  });
});
