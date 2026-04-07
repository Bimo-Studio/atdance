import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { loadSongPriority, saveSongPriority } from '@/pvp/songPriorityStore';

describe('songPriorityStore', () => {
  it('round-trips via idb-keyval (fake indexeddb)', async () => {
    const did = 'did:plc:testpriority';
    await saveSongPriority(did, {
      slots: [{ useMinimal: true }, { chartUrl: '/x.dance', chartIndex: 0 }, null],
    });
    const r = await loadSongPriority(did);
    expect(r.slots[0]).toEqual({ useMinimal: true });
    expect(r.slots[1]).toEqual({ chartUrl: '/x.dance', chartIndex: 0 });
    expect(r.slots[2]).toBe(null);
  });
});
