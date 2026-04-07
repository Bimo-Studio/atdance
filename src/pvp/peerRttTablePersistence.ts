import { get, set } from 'idb-keyval';

import { peerRttKeyForDid } from '@/pvp/didStorageKey';
import type { PeerRttEntry } from '@/pvp/peerRttTable';
import { PeerRttTable } from '@/pvp/peerRttTable';

function isPeerRttEntry(o: unknown): o is PeerRttEntry {
  if (typeof o !== 'object' || o === null) {
    return false;
  }
  const e = o as PeerRttEntry;
  return (
    typeof e.did === 'string' &&
    typeof e.bestRttMs === 'number' &&
    typeof e.lastSampleAt === 'number' &&
    typeof e.sampleCount === 'number' &&
    typeof e.lastJitterMs === 'number'
  );
}

export async function loadPeerRttTableForDid(did: string, nowMs: number): Promise<PeerRttTable> {
  const raw = await get<unknown>(peerRttKeyForDid(did));
  const t = new PeerRttTable();
  if (!Array.isArray(raw)) {
    return t;
  }
  const entries: PeerRttEntry[] = [];
  for (const item of raw) {
    if (isPeerRttEntry(item)) {
      entries.push(item);
    }
  }
  t.replaceFromSnapshot(entries, nowMs);
  return t;
}

export async function savePeerRttTableForDid(did: string, table: PeerRttTable): Promise<void> {
  await set(peerRttKeyForDid(did), [...table.snapshotEntries()]);
}
