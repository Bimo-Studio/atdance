import { describe, expect, it } from 'vitest';

import { decodePrioritySlot, encodePrioritySlot } from '@/pvp/prioritySlotCodec';

describe('prioritySlotCodec', () => {
  it('round-trips minimal', () => {
    const d = { useMinimal: true as const };
    expect(decodePrioritySlot(encodePrioritySlot(d))).toEqual(d);
  });

  it('round-trips chart', () => {
    const d = { chartUrl: '/songs/synrg/synrg.dance', chartIndex: 1 };
    expect(decodePrioritySlot(encodePrioritySlot(d))).toEqual(d);
  });

  it('round-trips magnet', () => {
    const d = { magnetUri: 'magnet:?xt=urn:btih:abc' };
    expect(decodePrioritySlot(encodePrioritySlot(d))).toEqual(d);
  });

  it('empty decodes to null', () => {
    expect(decodePrioritySlot('')).toBe(null);
    expect(decodePrioritySlot('   ')).toBe(null);
  });
});
