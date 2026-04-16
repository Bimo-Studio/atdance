import { describe, expect, it } from 'vitest';

import {
  adminAddEntry,
  adminRemoveDid,
  getEffectiveAllowlist,
  seedRowsFromEnv,
} from './allowlistStore';

function mockKv(initial: string | null): KVNamespace {
  let v = initial;
  return {
    get: async (_key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream') => {
      if (type === 'json') {
        return v === null ? null : (JSON.parse(v) as unknown);
      }
      return v;
    },
    put: async (_key: string, value: string) => {
      v = value;
    },
  } as unknown as KVNamespace;
}

describe('allowlistStore', () => {
  it('seeds from env when KV empty', async () => {
    const kv = mockKv(null);
    const env = { INVITE_ONLY: '1', ATPROTO_ALLOWLIST_DIDS: 'did:plc:a, did:plc:b' };
    const eff = await getEffectiveAllowlist(kv, env);
    expect(eff.version).toBe(0);
    expect([...eff.allowedDids].sort()).toEqual(['did:plc:a', 'did:plc:b']);
  });

  it('adminRemoveDid writes KV starting from env-only snapshot', async () => {
    const kv = mockKv(null);
    const env = { INVITE_ONLY: '1', ATPROTO_ALLOWLIST_DIDS: 'did:plc:a,did:plc:b' };
    const next = await adminRemoveDid(kv, env, 'did:plc:a');
    expect(next).not.toBeNull();
    expect(next!.entries.map((e) => e.did).sort()).toEqual(['did:plc:b']);
    const eff = await getEffectiveAllowlist(kv, env);
    expect(eff.allowedDids.has('did:plc:a')).toBe(false);
  });

  it('adminAddEntry dedupes by did', async () => {
    const kv = mockKv(null);
    const env = { INVITE_ONLY: '1', ATPROTO_ALLOWLIST_DIDS: 'did:plc:x' };
    await adminAddEntry(kv, env, { did: 'did:plc:x', handle: 'a.bsky.social' });
    const eff = await getEffectiveAllowlist(kv, env);
    expect(eff.entries).toEqual([{ did: 'did:plc:x', handle: 'a.bsky.social' }]);
  });

  it('seedRowsFromEnv trims', () => {
    const rows = seedRowsFromEnv({
      INVITE_ONLY: '1',
      ATPROTO_ALLOWLIST_DIDS: ' did:plc:z ',
    });
    expect(rows).toEqual([{ did: 'did:plc:z', handle: '' }]);
  });
});
