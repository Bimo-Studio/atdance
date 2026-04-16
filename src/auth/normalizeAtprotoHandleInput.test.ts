import { describe, expect, it } from 'vitest';

import { normalizeAtprotoHandleInput } from '@/auth/normalizeAtprotoHandleInput';

describe('normalizeAtprotoHandleInput', () => {
  it('strips one or more leading @ and trims', () => {
    expect(normalizeAtprotoHandleInput('  @distributed.camp  ')).toBe('distributed.camp');
    expect(normalizeAtprotoHandleInput('@@alice.test')).toBe('alice.test');
  });

  it('leaves handle-shaped input unchanged', () => {
    expect(normalizeAtprotoHandleInput('bob.bsky.social')).toBe('bob.bsky.social');
  });
});
