import * as jose from 'jose';

import { resolveAtHandleToDid } from './bskyPublic';

const DEFAULT_ADMIN_HANDLE = 'distributed.camp';

/** Env slice for admin JWT verification (Worker + tests). */
export type AdminVerifyEnv = {
  readonly ATDANCE_ADMIN_HANDLE?: string;
  /** When set, this DID is the admin account (skips handle→DID resolution). */
  readonly ATDANCE_ADMIN_DID?: string;
  readonly ATDANCE_OAUTH_AS_JWKS_URL?: string;
  readonly ATDANCE_OAUTH_AS_JWKS_JSON?: string;
};

export function adminHandleFromEnv(env: { readonly ATDANCE_ADMIN_HANDLE?: string }): string {
  const h = env.ATDANCE_ADMIN_HANDLE?.trim().toLowerCase();
  return h !== undefined && h !== '' ? h.replace(/^@/, '') : DEFAULT_ADMIN_HANDLE;
}

function pinnedAdminDidFromEnv(env: AdminVerifyEnv): string | null {
  const raw = env.ATDANCE_ADMIN_DID?.trim();
  return raw !== undefined && raw !== '' && raw.startsWith('did:') ? raw : null;
}

function issuerCandidates(issFromJwt: string, asIssuerFromMetadata: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const base of [issFromJwt, asIssuerFromMetadata]) {
    const b = base.trim();
    if (b === '') {
      continue;
    }
    for (const v of [b, b.replace(/\/$/, ''), `${b.replace(/\/$/, '')}/`]) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

async function loadJson(url: URL): Promise<unknown | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function parseJwksDocument(raw: unknown): jose.JSONWebKeySet | null {
  if (typeof raw !== 'object' || raw === null || !('keys' in raw)) {
    return null;
  }
  const keys = (raw as { keys: unknown }).keys;
  if (!Array.isArray(keys) || keys.length === 0) {
    return null;
  }
  return raw as jose.JSONWebKeySet;
}

function jwksFromEnvJson(env: AdminVerifyEnv): jose.JSONWebKeySet | null {
  const raw = env.ATDANCE_OAUTH_AS_JWKS_JSON?.trim();
  if (raw === undefined || raw === '') {
    return null;
  }
  try {
    return parseJwksDocument(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/**
 * Load AS signing JWKS. The URL advertised in OAuth metadata may return an empty `keys` array
 * (observed for `https://bsky.social/oauth/jwks` as of 2026-04), which makes JWT signature
 * verification impossible without an override.
 */
async function loadAuthorizationServerJwks(
  resolvedJwksUri: string,
  env: AdminVerifyEnv,
): Promise<jose.JSONWebKeySet | null> {
  const override = env.ATDANCE_OAUTH_AS_JWKS_URL?.trim();
  const urls = override !== undefined && override !== '' ? [override] : [resolvedJwksUri];
  for (const u of urls) {
    let href: string;
    try {
      href = new URL(u).href;
    } catch {
      continue;
    }
    const doc = await loadJson(new URL(href));
    const jwks = parseJwksDocument(doc);
    if (jwks !== null) {
      return jwks;
    }
  }
  return jwksFromEnvJson(env);
}

/**
 * OAuth JWT access tokens may use an `iss` that is a protected resource (e.g. PDS) rather than
 * the authorization server. Resolve JWKS from AS metadata, using RFC9728 protected-resource
 * metadata when `/.well-known/oauth-authorization-server` is not available at `iss`.
 */
export async function resolveOAuthJwksForIssuer(
  issFromJwt: string,
): Promise<{ jwksUri: string; asIssuer: string } | null> {
  const tryAuthorizationServer = async (
    baseIss: string,
  ): Promise<{ jwksUri: string; asIssuer: string } | null> => {
    const metaUrl = new URL('/.well-known/oauth-authorization-server', baseIss);
    const meta = (await loadJson(metaUrl)) as { jwks_uri?: unknown; issuer?: unknown } | null;
    if (meta === null) {
      return null;
    }
    if (typeof meta.jwks_uri !== 'string' || meta.jwks_uri === '') {
      return null;
    }
    const asIssuer = typeof meta.issuer === 'string' && meta.issuer !== '' ? meta.issuer : baseIss;
    return { jwksUri: meta.jwks_uri, asIssuer };
  };

  const direct = await tryAuthorizationServer(issFromJwt);
  if (direct !== null) {
    return direct;
  }

  const prUrl = new URL('/.well-known/oauth-protected-resource', issFromJwt);
  const pr = (await loadJson(prUrl)) as { authorization_servers?: unknown } | null;
  const servers = pr?.authorization_servers;
  if (!Array.isArray(servers) || typeof servers[0] !== 'string' || servers[0] === '') {
    return null;
  }
  return tryAuthorizationServer(servers[0]);
}

export type VerifyRelayAdminTokenResult =
  | { ok: true; sub: string }
  | { ok: false; reason: string; details?: { token_sub: string; expected_did: string } };

export async function verifyRelayAdminAccessToken(
  accessToken: string,
  env: AdminVerifyEnv,
): Promise<VerifyRelayAdminTokenResult> {
  let sub: string;
  try {
    const unverified = jose.decodeJwt(accessToken);
    const iss = unverified.iss;
    if (typeof iss !== 'string') {
      return { ok: false, reason: 'invalid_token' };
    }
    const resolved = await resolveOAuthJwksForIssuer(iss);
    if (resolved === null) {
      return { ok: false, reason: 'issuer_metadata' };
    }
    const jwksDoc = await loadAuthorizationServerJwks(resolved.jwksUri, env);
    if (jwksDoc === null) {
      return { ok: false, reason: 'jwks_empty' };
    }
    const JWKS = jose.createLocalJWKSet(jwksDoc);
    const { payload } = await jose.jwtVerify(accessToken, JWKS, {
      issuer: issuerCandidates(iss, resolved.asIssuer),
      clockTolerance: 120,
    });
    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('did:')) {
      return { ok: false, reason: 'sub' };
    }
    sub = payload.sub;
  } catch {
    return { ok: false, reason: 'jwt_verify' };
  }

  const adminHandle = adminHandleFromEnv(env);
  const want = adminHandle.toLowerCase().replace(/^@/, '');
  const adminDid = pinnedAdminDidFromEnv(env) ?? (await resolveAtHandleToDid(want));
  if (adminDid == null || adminDid === '') {
    return { ok: false, reason: 'admin_handle' };
  }
  if (sub !== adminDid) {
    return {
      ok: false,
      reason: 'forbidden',
      details: { token_sub: sub, expected_did: adminDid },
    };
  }
  return { ok: true, sub };
}

export type AdminBearerFailure =
  | { ok: false; status: 401; reason: 'missing_bearer' }
  | {
      ok: false;
      status: 403;
      reason: string;
      details?: { token_sub: string; expected_did: string };
    };

export async function requireAdminBearer(
  request: Request,
  env: AdminVerifyEnv,
): Promise<{ ok: true; sub: string } | AdminBearerFailure> {
  const auth = request.headers.get('Authorization') ?? '';
  const m = /^(?:Bearer|DPoP)\s+(.+)$/i.exec(auth);
  if (m === null) {
    return { ok: false, status: 401, reason: 'missing_bearer' };
  }
  const token = m[1]!.trim();
  const v = await verifyRelayAdminAccessToken(token, env);
  if (!v.ok) {
    return {
      ok: false,
      status: 403,
      reason: v.reason,
      ...(v.details !== undefined ? { details: v.details } : {}),
    };
  }
  return { ok: true, sub: v.sub };
}
