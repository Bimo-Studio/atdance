import { get, set } from 'idb-keyval';

import { magnetsKeyForDid } from '@/pvp/didStorageKey';

export interface MagnetEntry {
  readonly uri: string;
  readonly label?: string;
}

const MAX_MAGNETS = 50;

export async function loadMagnetLibrary(did: string): Promise<MagnetEntry[]> {
  const key = magnetsKeyForDid(did);
  const raw = await get<unknown>(key);
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: MagnetEntry[] = [];
  for (const item of raw) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'uri' in item &&
      typeof (item as MagnetEntry).uri === 'string'
    ) {
      const uri = (item as MagnetEntry).uri;
      const label =
        typeof (item as MagnetEntry).label === 'string' ? (item as MagnetEntry).label : undefined;
      if (uri.startsWith('magnet:')) {
        out.push({ uri, label });
      }
    }
  }
  return out.slice(0, MAX_MAGNETS);
}

export async function saveMagnetLibrary(
  did: string,
  magnets: readonly MagnetEntry[],
): Promise<void> {
  const key = magnetsKeyForDid(did);
  const trimmed = magnets
    .filter((m) => m.uri.startsWith('magnet:'))
    .slice(0, MAX_MAGNETS)
    .map((m) => ({ uri: m.uri, ...(m.label !== undefined ? { label: m.label } : {}) }));
  await set(key, trimmed);
}
