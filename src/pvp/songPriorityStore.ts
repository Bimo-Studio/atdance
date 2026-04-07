import { get, set } from 'idb-keyval';

import type { PlaySceneData } from '@/play/playSceneData';
import { songPriorityKeyForDid } from '@/pvp/didStorageKey';
import { decodePrioritySlot, encodePrioritySlot } from '@/pvp/prioritySlotCodec';

export interface SongPriorityState {
  /** Three ordered slots; `null` = unset. */
  readonly slots: readonly [PlaySceneData | null, PlaySceneData | null, PlaySceneData | null];
}

const EMPTY: SongPriorityState = {
  slots: [null, null, null],
};

export async function loadSongPriority(did: string): Promise<SongPriorityState> {
  const key = songPriorityKeyForDid(did);
  const raw = await get<unknown>(key);
  if (!Array.isArray(raw) || raw.length !== 3) {
    return EMPTY;
  }
  const slots: [PlaySceneData | null, PlaySceneData | null, PlaySceneData | null] = [
    null,
    null,
    null,
  ];
  for (let i = 0; i < 3; i += 1) {
    const cell = raw[i];
    if (typeof cell !== 'string') {
      continue;
    }
    slots[i] = decodePrioritySlot(cell);
  }
  return { slots };
}

export async function saveSongPriority(did: string, state: SongPriorityState): Promise<void> {
  const key = songPriorityKeyForDid(did);
  const encoded = state.slots.map((s) => (s === null ? '' : encodePrioritySlot(s)));
  if (encoded.length !== 3) {
    throw new Error('Expected exactly 3 priority slots');
  }
  await set(key, encoded);
}

export function setSlot(
  state: SongPriorityState,
  index: 0 | 1 | 2,
  data: PlaySceneData | null,
): SongPriorityState {
  const next: [PlaySceneData | null, PlaySceneData | null, PlaySceneData | null] = [...state.slots];
  next[index] = data;
  return { slots: next };
}
