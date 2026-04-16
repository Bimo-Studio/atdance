import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./adminVerify', () => ({
  requireAdminBearer: vi.fn().mockResolvedValue({ ok: true, sub: 'did:plc:admin' }),
  adminHandleFromEnv: vi.fn(() => 'distributed.camp'),
}));

vi.mock('./bskyPublic', () => ({
  fetchBskyHandleForDid: vi.fn(),
  resolveAtHandleToDid: vi.fn(),
}));

import { handleRelayHttp } from './relayHttp';
import { fetchBskyHandleForDid, resolveAtHandleToDid } from './bskyPublic';

function mockKv(initial: string | null): KVNamespace {
  let v = initial;
  return {
    get: async (_key: string, type?: 'text' | 'json') => {
      if (v === null) {
        return null;
      }
      if (type === 'json') {
        return JSON.parse(v) as unknown;
      }
      return v;
    },
    put: async (_key: string, value: string) => {
      v = value;
    },
  } as unknown as KVNamespace;
}

describe('handleRelayHttp parseAddBody (AppView)', () => {
  const baseEnv = {
    INVITE_ONLY: '1',
    ATPROTO_ALLOWLIST_DIDS: 'did:plc:seed',
    ALLOWLIST_KV: mockKv(null),
  };

  beforeEach(() => {
    vi.mocked(fetchBskyHandleForDid).mockReset();
    vi.mocked(resolveAtHandleToDid).mockReset();
  });

  it('add fills handle from getProfile when only did is sent', async () => {
    vi.mocked(fetchBskyHandleForDid).mockResolvedValue('filled.handle');
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:only' }),
    });
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(200);
    expect(fetchBskyHandleForDid).toHaveBeenCalledWith('did:plc:only');
    const j = (await res.json()) as { entries: { did: string; handle: string }[] };
    const row = j.entries.find((e) => e.did === 'did:plc:only');
    expect(row?.handle).toBe('filled.handle');
  });

  it('add resolves handle-only body', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:fromapi');
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Someone.Bsky.Social' }),
    });
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(200);
    expect(resolveAtHandleToDid).toHaveBeenCalledWith('Someone.Bsky.Social');
    const j = (await res.json()) as { entries: { did: string; handle: string }[] };
    const row = j.entries.find((e) => e.did === 'did:plc:fromapi');
    expect(row?.handle).toBe('someone.bsky.social');
  });

  it('add returns bad_body when handle does not resolve', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue(null);
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'ghost.test' }),
    });
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(400);
  });
});
