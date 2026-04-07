import { describe, expect, it } from 'vitest';

import { agreeStartAtUnixMs } from '@/pvp/agreeStartTime';

describe('agreeStartAtUnixMs', () => {
  it('adds lead-in to now', () => {
    expect(agreeStartAtUnixMs({ nowUnixMs: 1000, leadInMs: 3000 })).toBe(4000);
  });
});
