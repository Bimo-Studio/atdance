import { isValidTid } from '@atproto/syntax';
import { describe, expect, it } from 'vitest';

import { newAtprotoTid } from './atprotoTid';

describe('newAtprotoTid', () => {
  it('produces a valid 13-char ATProto TID', () => {
    const t = newAtprotoTid();
    expect(t.length).toBe(13);
    expect(isValidTid(t)).toBe(true);
  });
});
