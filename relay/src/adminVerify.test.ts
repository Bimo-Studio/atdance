import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  mockDecodeJwt: vi.fn(),
  mockJwtVerify: vi.fn(),
}));

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    decodeJwt: hoisted.mockDecodeJwt,
    jwtVerify: hoisted.mockJwtVerify,
  };
});

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

/** Minimal valid P-256 JWK for `createLocalJWKSet` (signature still mocked via `jwtVerify`). */
const TEST_AS_JWKS = {
  keys: [
    {
      kty: 'EC',
      crv: 'P-256',
      kid: 'test',
      x: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
      y: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWbbtBmVjk',
    },
  ],
} as const;

function stubDefaultOAuthFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (url.includes('/.well-known/oauth-authorization-server')) {
        return {
          ok: true,
          json: async () => ({
            jwks_uri: 'https://iss.example/jwks',
            issuer: 'https://iss.example',
          }),
        };
      }
      if (url.includes('iss.example/jwks')) {
        return { ok: true, json: async () => ({ ...TEST_AS_JWKS }) };
      }
      return { ok: false, status: 404 };
    }),
  );
}

describe('verifyRelayAdminAccessToken', () => {
  beforeEach(() => {
    vi.mocked(resolveAtHandleToDid).mockReset();
    hoisted.mockDecodeJwt.mockReturnValue({ iss: 'https://iss.example' });
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'did:plc:me' } });
    stubDefaultOAuthFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok when jwt verifies and sub matches resolved admin DID', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
    await expect(verifyRelayAdminAccessToken('header.payload.sig', {})).resolves.toEqual({
      ok: true,
      sub: 'did:plc:me',
    });
  });

  it('uses ATDANCE_ADMIN_DID when set instead of resolving handle', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue(null);
    await expect(
      verifyRelayAdminAccessToken('header.payload.sig', {
        ATDANCE_ADMIN_DID: 'did:plc:me',
      }),
    ).resolves.toEqual({ ok: true, sub: 'did:plc:me' });
    expect(resolveAtHandleToDid).not.toHaveBeenCalled();
  });

  it('returns forbidden when sub differs from resolved admin DID', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    await expect(verifyRelayAdminAccessToken('header.payload.sig', {})).resolves.toEqual({
      ok: false,
      reason: 'forbidden',
      details: { token_sub: 'did:plc:me', expected_did: 'did:plc:admin' },
    });
  });

  it('returns admin_handle when resolveHandle fails', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue(null);
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'admin_handle',
    });
  });

  it('returns issuer_metadata when metadata cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toMatchObject({
      ok: false,
      reason: 'issuer_metadata',
    });
  });

  it('returns issuer_metadata when AS and protected-resource metadata lack JWKS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'issuer_metadata',
    });
  });

  it('returns jwks_empty when JWKS document has no keys and no env fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes('/.well-known/oauth-authorization-server')) {
          return {
            ok: true,
            json: async () => ({
              jwks_uri: 'https://iss.example/jwks',
              issuer: 'https://iss.example',
            }),
          };
        }
        if (url.includes('/jwks')) {
          return { ok: true, json: async () => ({ keys: [] }) };
        }
        return { ok: false, status: 404 };
      }),
    );
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'jwks_empty',
    });
  });

  it('uses ATDANCE_OAUTH_AS_JWKS_JSON when published JWKS is empty', async () => {
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes('/.well-known/oauth-authorization-server')) {
          return {
            ok: true,
            json: async () => ({
              jwks_uri: 'https://iss.example/jwks',
              issuer: 'https://iss.example',
            }),
          };
        }
        if (url.includes('/jwks')) {
          return { ok: true, json: async () => ({ keys: [] }) };
        }
        return { ok: false, status: 404 };
      }),
    );
    await expect(
      verifyRelayAdminAccessToken('t', {
        ATDANCE_OAUTH_AS_JWKS_JSON: JSON.stringify(TEST_AS_JWKS),
      }),
    ).resolves.toEqual({ ok: true, sub: 'did:plc:me' });
  });

  it('returns jwt_verify when jwtVerify throws', async () => {
    hoisted.mockJwtVerify.mockRejectedValue(new Error('bad sig'));
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'jwt_verify',
    });
  });

  it('returns sub when payload sub is not a did', async () => {
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'not-a-did' } });
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'sub',
    });
  });

  it('returns invalid_token when iss missing', async () => {
    hoisted.mockDecodeJwt.mockReturnValue({});
    await expect(verifyRelayAdminAccessToken('t', {})).resolves.toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  it('loads JWKS via oauth-protected-resource when AS well-known is not at token iss', async () => {
    hoisted.mockDecodeJwt.mockReturnValue({ iss: 'https://pds.example' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (url.includes('/.well-known/oauth-authorization-server')) {
          if (url.includes('pds.example')) {
            return { ok: false, status: 404 };
          }
          return {
            ok: true,
            json: async () => ({
              issuer: 'https://auth.example',
              jwks_uri: 'https://auth.example/jwks',
            }),
          };
        }
        if (url.includes('/.well-known/oauth-protected-resource')) {
          return {
            ok: true,
            json: async () => ({ authorization_servers: ['https://auth.example'] }),
          };
        }
        if (url.includes('auth.example/jwks')) {
          return { ok: true, json: async () => ({ ...TEST_AS_JWKS }) };
        }
        return { ok: false, status: 404 };
      }),
    );
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
    await expect(verifyRelayAdminAccessToken('header.payload.sig', {})).resolves.toEqual({
      ok: true,
      sub: 'did:plc:me',
    });
  });
});

describe('requireAdminBearer', () => {
  beforeEach(() => {
    vi.mocked(resolveAtHandleToDid).mockReset();
    hoisted.mockDecodeJwt.mockReturnValue({ iss: 'https://iss.example' });
    hoisted.mockJwtVerify.mockResolvedValue({ payload: { sub: 'did:plc:me' } });
    stubDefaultOAuthFetch();
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:me');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 401 without Authorization header', async () => {
    const req = new Request('https://x/admin');
    await expect(requireAdminBearer(req, {})).resolves.toEqual({
      ok: false,
      status: 401,
      reason: 'missing_bearer',
    });
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
    await expect(requireAdminBearer(req, {})).resolves.toEqual({
      ok: false,
      status: 403,
      reason: 'forbidden',
      details: { token_sub: 'did:plc:me', expected_did: 'did:plc:other' },
    });
  });

  it('accepts Bearer matching ATDANCE_ADMIN_API_TOKEN (no JWT verify)', async () => {
    hoisted.mockJwtVerify.mockClear();
    vi.mocked(resolveAtHandleToDid).mockResolvedValue('did:plc:admin');
    const req = new Request('https://x/admin', {
      headers: { Authorization: 'Bearer secret-op-token' },
    });
    await expect(
      requireAdminBearer(req, { ATDANCE_ADMIN_API_TOKEN: 'secret-op-token' }),
    ).resolves.toEqual({ ok: true, sub: 'did:plc:admin' });
    expect(hoisted.mockJwtVerify).not.toHaveBeenCalled();
  });

  it('uses ATDANCE_ADMIN_DID when API token matches (skips handle resolve)', async () => {
    const req = new Request('https://x/admin', {
      headers: { Authorization: 'Bearer t' },
    });
    await expect(
      requireAdminBearer(req, {
        ATDANCE_ADMIN_API_TOKEN: 't',
        ATDANCE_ADMIN_DID: 'did:plc:pinned',
      }),
    ).resolves.toEqual({ ok: true, sub: 'did:plc:pinned' });
    expect(resolveAtHandleToDid).not.toHaveBeenCalled();
  });

  it('returns admin_api_token_mismatch when Bearer is opaque and does not match API token', async () => {
    hoisted.mockJwtVerify.mockClear();
    const req = new Request('https://x/admin', {
      headers: { Authorization: 'Bearer wrong-opaque' },
    });
    await expect(
      requireAdminBearer(req, { ATDANCE_ADMIN_API_TOKEN: 'expected-secret' }),
    ).resolves.toEqual({
      ok: false,
      status: 403,
      reason: 'admin_api_token_mismatch',
    });
    expect(hoisted.mockJwtVerify).not.toHaveBeenCalled();
  });
});
