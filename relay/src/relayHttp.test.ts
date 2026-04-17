import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleRelayHttp } from './relayHttp';

vi.mock('./adminVerify', () => ({
  requireAdminBearer: vi.fn(),
  adminHandleFromEnv: vi.fn(() => 'distributed.camp'),
}));

import { adminHandleFromEnv, requireAdminBearer } from './adminVerify';

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

const baseEnv = {
  INVITE_ONLY: '1',
  ATPROTO_ALLOWLIST_DIDS: 'did:plc:a,did:plc:b',
};

describe('handleRelayHttp', () => {
  beforeEach(() => {
    vi.mocked(requireAdminBearer).mockReset();
    vi.mocked(adminHandleFromEnv).mockReturnValue('distributed.camp');
  });

  it('OPTIONS returns 204 with CORS', async () => {
    const req = new Request('https://relay.test/allowlist/v1/check', {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.test' },
    });
    const res = await handleRelayHttp(req, { ...baseEnv, ATDANCE_APP_ORIGINS: '*' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.test');
  });

  it('allowlist check returns allowed and version', async () => {
    const req = new Request('https://relay.test/allowlist/v1/check?did=did%3Aplc%3Aa');
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: true, version: 0 });
  });

  it('allowlist check rejects bad did', async () => {
    const req = new Request('https://relay.test/allowlist/v1/check?did=not-a-did');
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_did' });
  });

  it('admin GET returns 401 when bearer missing', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: false, status: 401 });
    const req = new Request('https://relay.test/admin/allowlist/v1');
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(401);
  });

  it('admin GET returns list when authorized', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const req = new Request('https://relay.test/admin/allowlist/v1');
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { version: number; entries: { did: string }[] };
    expect(j.version).toBe(0);
    expect(j.entries.map((e) => e.did).sort()).toEqual(['did:plc:a', 'did:plc:b']);
  });

  it('admin add returns 503 without KV', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:z', handle: 'z.test' }),
    });
    const res = await handleRelayHttp(req, baseEnv);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'allowlist_kv_unconfigured' });
  });

  it('admin add succeeds with KV', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const kv = mockKv(null);
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:z', handle: 'z.test' }),
    });
    const res = await handleRelayHttp(req, { ...baseEnv, ALLOWLIST_KV: kv });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { ok: boolean; entries: { did: string }[] };
    expect(j.ok).toBe(true);
    expect(j.entries.some((e) => e.did === 'did:plc:z')).toBe(true);
  });

  it('admin add rejects invalid JSON', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const kv = mockKv(null);
    const req = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const res = await handleRelayHttp(req, { ...baseEnv, ALLOWLIST_KV: kv });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_json' });
  });

  it('admin remove returns 404 when did not in list', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const kv = mockKv(null);
    const req = new Request('https://relay.test/admin/allowlist/v1/remove', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:missing' }),
    });
    const res = await handleRelayHttp(req, { ...baseEnv, ALLOWLIST_KV: kv });
    expect(res.status).toBe(404);
  });

  it('admin remove returns 400 for non-did', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const kv = mockKv(null);
    const req = new Request('https://relay.test/admin/allowlist/v1/remove', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'alice' }),
    });
    const res = await handleRelayHttp(req, { ...baseEnv, ALLOWLIST_KV: kv });
    expect(res.status).toBe(400);
  });

  it('admin remove succeeds after add', async () => {
    vi.mocked(requireAdminBearer).mockResolvedValue({ ok: true, sub: 'did:plc:admin' });
    const kv = mockKv(null);
    const env = { ...baseEnv, ALLOWLIST_KV: kv };
    const add = new Request('https://relay.test/admin/allowlist/v1/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:rm', handle: 'rm.test' }),
    });
    expect((await handleRelayHttp(add, env)).status).toBe(200);
    const rem = new Request('https://relay.test/admin/allowlist/v1/remove', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did: 'did:plc:rm' }),
    });
    const res = await handleRelayHttp(rem, env);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { entries: { did: string }[] };
    expect(j.entries.some((e) => e.did === 'did:plc:rm')).toBe(false);
  });

  it('unknown path returns 200 plain text', async () => {
    const res = await handleRelayHttp(new Request('https://relay.test/other'), baseEnv);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('ATDance relay');
  });

  it('restricts CORS to allowlist when ATDANCE_APP_ORIGINS set', async () => {
    const ok = new Request('https://relay.test/allowlist/v1/check?did=did%3Aplc%3Aa', {
      headers: { Origin: 'https://good.test' },
    });
    const resOk = await handleRelayHttp(ok, {
      ...baseEnv,
      ATDANCE_APP_ORIGINS: 'https://good.test',
    });
    expect(resOk.headers.get('access-control-allow-origin')).toBe('https://good.test');

    const bad = new Request('https://relay.test/allowlist/v1/check?did=did%3Aplc%3Aa', {
      headers: { Origin: 'https://evil.test' },
    });
    const resBad = await handleRelayHttp(bad, {
      ...baseEnv,
      ATDANCE_APP_ORIGINS: 'https://good.test',
    });
    expect(resBad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('matches Origin when ATDANCE_APP_ORIGINS entry has trailing slash', async () => {
    const req = new Request('https://relay.test/admin/allowlist/v1', {
      method: 'OPTIONS',
      headers: { Origin: 'https://good.test', 'Access-Control-Request-Method': 'GET' },
    });
    const res = await handleRelayHttp(req, {
      ...baseEnv,
      ATDANCE_APP_ORIGINS: 'https://good.test/',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://good.test');
  });
});
