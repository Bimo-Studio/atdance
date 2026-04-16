import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  mockDecodeJwt: vi.fn(),
  mockCreateRemoteJWKSet: vi.fn(() => ({})),
  mockJwtVerify: vi.fn(),
}));

vi.mock('jose', () => ({
  decodeJwt: hoisted.mockDecodeJwt,
  createRemoteJWKSet: hoisted.mockCreateRemoteJWKSet,
  jwtVerify: hoisted.mockJwtVerify,
}));

vi.mock('./bskyPublic', () => ({
  resolveAtHandleToDid: vi.fn(),
}));

import { adminHandleFromEnv, requireAdminBearer, verifyRelayAdminAccessToken } from './adminVerify';
import { resolveAtHandleToDid } from './bskyPublic';

describe('adminHandleFromEnv', () => {
  it('defaults to distributed.camp', () => {
    expect(adminHandleFromEnv({})).toBe('distributed.camp');
  });

  it('strips at-prefix', () => {
    expect(adminHandleFromEnv({ ATDANCE_ADMIN_HANDLE: '@Example.social ' })).toBe('example.social');
  });
});

describe('verifyRelayAdminAccessToken', () => {
  beforeEach(() => {
    vi.mocked(resolveAtHandleToDid).mockReset();
    hoisted.mockDecodeJwt.mockReturnValue({ iss: 'https://iss.example' });
    hoisted.mockCreateRemoteJWKSet.mockReturnValue({});
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'did:plc:me' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jwks_uri: 'https://iss.example/jwks' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok when jwt verifies and sub matches resolved admin DID', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
    await expect(
      verifyRelayAdminAccessToken('header.payload.sig', 'distributed.camp'),
    ).resolves.toEqual({ ok: true, sub: 'did:plc:me' });
  });

  it('returns forbidden when sub differs from resolved admin DID', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    await expect(
      verifyRelayAdminAccessToken('header.payload.sig', 'distributed.camp'),
    ).resolves.toEqual({ ok: false, reason: 'forbidden' });
  });

  it('returns admin_handle when resolveHandle fails', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue(null);
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toEqual({
      ok: false,
      reason: 'admin_handle',
    });
  });

  it('returns issuer_metadata when well-known fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toMatchObject({
      ok: false,
      reason: 'issuer_metadata',
    });
  });

  it('returns jwks when metadata omits jwks_uri', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toEqual({
      ok: false,
      reason: 'jwks',
    });
  });

  it('returns jwt_verify when jwtVerify throws', async () => {
    hoisted.mockJwtVerify.mockRejectedValue(new Error('bad sig'));
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toEqual({
      ok: false,
      reason: 'jwt_verify',
    });
  });

  it('returns sub when payload sub is not a did', async () => {
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'not-a-did' } });
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toEqual({
      ok: false,
      reason: 'sub',
    });
  });

  it('returns invalid_token when iss missing', async () => {
    hoisted.mockDecodeJwt.mockReturnValue({});
    await expect(verifyRelayAdminAccessToken('t', 'distributed.camp')).resolves.toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });
});

describe('requireAdminBearer', () => {
  beforeEach(() => {
    vi.mocked(resolveAtHandleToDid).mockReset();
    hoisted.mockDecodeJwt.mockReturnValue({ iss: 'https://iss.example' });
    hoisted.mockCreateRemoteJWKSet.mockReturnValue({});
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'did:plc:me' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jwks_uri: 'https://iss.example/jwks' }),
      }),
    );
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 401 without Authorization header', async () => {
    const req = new Request('https://x/admin');
    await expect(requireAdminBearer(req, {})).resolves.toEqual({ ok: false, status: 401 });
  });

  it('accepts DPoP scheme', async () => {
    const req = new Request('https://x/admin', {
      headers: { Authorization: 'DPoP eyJ.a.b' },
    });
    await expect(requireAdminBearer(req, {})).resolves.toEqual({ ok: true, sub: 'did:plc:me' });
  });

  it('returns 403 when verify fails', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:other');
    const req = new Request('https://x/admin', {
      headers: { Authorization: 'Bearer eyJ.a.b' },
    });
    await expect(requireAdminBearer(req, {})).resolves.toEqual({ ok: false, status: 403 });
  });
});
