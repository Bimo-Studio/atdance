import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { loadMagnetLibrary, saveMagnetLibrary } from '@/pvp/magnetLibraryStore';

describe('magnetLibraryStore', () => {
  it('round-trips magnets for a DID', async () => {
    const did = 'did:plc:testmagnets';
    await saveMagnetLibrary(did, [{ uri: 'magnet:?xt=urn:btih:abc', label: 't' }]);
    const r = await loadMagnetLibrary(did);
    expect(r).toEqual([{ uri: 'magnet:?xt=urn:btih:abc', label: 't' }]);
  });

  it('drops non-magnet URIs', async () => {
    const did = 'did:plc:testmagnets2';
    await saveMagnetLibrary(did, [{ uri: 'https://example.com' }]);
    const r = await loadMagnetLibrary(did);
    expect(r).toEqual([]);
  });
});
