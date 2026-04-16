import * as jose from 'jose';

import { resolveAtHandleToDid } from './bskyPublic';

const DEFAULT_ADMIN_HANDLE = 'distributed.camp';

export function adminHandleFromEnv(env: { readonly ATDANCE_ADMIN_HANDLE?: string }): string {
  const h = env.ATDANCE_ADMIN_HANDLE?.trim().toLowerCase();
  return h !== undefined && h !== '' ? h.replace(/^@/, '') : DEFAULT_ADMIN_HANDLE;
}

export async function verifyRelayAdminAccessToken(
  accessToken: string,
  adminHandle: string,
): Promise<{ ok: true; sub: string } | { ok: false; reason: string }> {
  let sub: string;
  try {
    const unverified = jose.decodeJwt(accessToken);
    const iss = unverified.iss;
    if (typeof iss !== 'string') {
      return { ok: false, reason: 'invalid_token' };
    }
    const metaUrl = new URL('/.well-known/oauth-authorization-server', iss);
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(8000) });
    if (!metaRes.ok) {
      return { ok: false, reason: 'issuer_metadata' };
    }
    const meta = (await metaRes.json()) as { jwks_uri?: string };
    if (typeof meta.jwks_uri !== 'string') {
      return { ok: false, reason: 'jwks' };
    }
    const JWKS = jose.createRemoteJWKSet(new URL(meta.jwks_uri));
    const { payload } = await jose.jwtVerify(accessToken, JWKS, {
      issuer: iss,
      clockTolerance: 120,
    });
    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('did:')) {
      return { ok: false, reason: 'sub' };
    }
    sub = payload.sub;
  } catch {
    return { ok: false, reason: 'jwt_verify' };
  }

  const want = adminHandle.toLowerCase().replace(/^@/, '');
  const adminDid = await resolveAtHandleToDid(want);
  if (adminDid === null) {
    return { ok: false, reason: 'admin_handle' };
  }
  if (sub !== adminDid) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, sub };
}

export async function requireAdminBearer(
  request: Request,
  env: { readonly ATDANCE_ADMIN_HANDLE?: string },
): Promise<{ ok: true; sub: string } | { ok: false; status: number }> {
  const auth = request.headers.get('Authorization') ?? '';
  const m = /^(?:Bearer|DPoP)\s+(.+)$/i.exec(auth);
  if (m === null) {
    return { ok: false, status: 401 };
  }
  const token = m[1]!.trim();
  const adminHandle = adminHandleFromEnv(env);
  const v = await verifyRelayAdminAccessToken(token, adminHandle);
  if (!v.ok) {
    return { ok: false, status: 403 };
  }
  return { ok: true, sub: v.sub };
}
