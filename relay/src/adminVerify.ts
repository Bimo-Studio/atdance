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
  /**
   * Optional shared secret: `Authorization: Bearer <this>` grants admin (same DID as handle/env pin).
   * Use when the OAuth AS publishes an empty JWKS (browser admin UI still uses DPoP JWTs; use curl/scripts with this bearer).
   */
  readonly ATDANCE_ADMIN_API_TOKEN?: string;
  /** Browser admin: checked at `POST /admin/session/v1/login`; exchanged for a session JWT. */
  readonly ATDANCE_ADMIN_PASSWORD?: string;
  /** HMAC secret for admin session JWTs (HS256). */
  readonly ATDANCE_ADMIN_SESSION_SECRET?: string;
};

const ADMIN_SESSION_ISSUER = 'atdance-relay';
const ADMIN_SESSION_AUDIENCE = 'atdance-relay-admin';

export function adminHandleFromEnv(env: { readonly ATDANCE_ADMIN_HANDLE?: string }): string {
  const h = env.ATDANCE_ADMIN_HANDLE?.trim().toLowerCase();
  return h !== undefined && h !== '' ? h.replace(/^@/, '') : DEFAULT_ADMIN_HANDLE;
}

function pinnedAdminDidFromEnv(env: AdminVerifyEnv): string | null {
  const raw = env.ATDANCE_ADMIN_DID?.trim();
  return raw !== undefined && raw !== '' && raw.startsWith('did:') ? raw : null;
}

/** Constant-time UTF-8 compare; used for admin password and API token checks. */
function timingSafeEqualUtf8(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) {
    return false;
  }
  let x = 0;
  for (let i = 0; i < ea.length; i++) {
    x |= ea[i]! ^ eb[i]!;
  }
  return x === 0;
}

/** True when `password` matches `ATDANCE_ADMIN_PASSWORD` (timing-safe for equal lengths). */
export function verifyAdminPlainPassword(env: AdminVerifyEnv, password: string): boolean {
  const expected = env.ATDANCE_ADMIN_PASSWORD?.trim();
  if (expected === undefined || expected === '') {
    return false;
  }
  return timingSafeEqualUtf8(password, expected);
}

/** Rough JWS compact-serialization shape (three non-empty segments). */
function looksLikeCompactJwt(s: string): boolean {
  const parts = s.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Mint a short-lived HS256 JWT for allowlist admin APIs after password login.
 * Returns null if session secret is missing or admin DID cannot be resolved.
 */
export async function mintAdminSessionJwt(env: AdminVerifyEnv): Promise<string | null> {
  const secret = env.ATDANCE_ADMIN_SESSION_SECRET?.trim();
  if (secret === undefined || secret === '') {
    return null;
  }
  const adminHandle = adminHandleFromEnv(env);
  const want = adminHandle.toLowerCase().replace(/^@/, '');
  const adminDid = pinnedAdminDidFromEnv(env) ?? (await resolveAtHandleToDid(want));
  if (adminDid == null || adminDid === '') {
    return null;
  }
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminDid)
    .setIssuer(ADMIN_SESSION_ISSUER)
    .setAudience(ADMIN_SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(key);
}

function looksLikeAdminSessionToken(token: string): boolean {
  if (!looksLikeCompactJwt(token)) {
    return false;
  }
  try {
    const h = jose.decodeProtectedHeader(token);
    if (h.alg !== 'HS256') {
      return false;
    }
    const p = jose.decodeJwt(token) as { iss?: unknown };
    return p.iss === ADMIN_SESSION_ISSUER;
  } catch {
    return false;
  }
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

async function verifyAdminSessionAccessToken(
  accessToken: string,
  env: AdminVerifyEnv,
): Promise<VerifyRelayAdminTokenResult> {
  const secret = env.ATDANCE_ADMIN_SESSION_SECRET?.trim();
  if (secret === undefined || secret === '') {
    return { ok: false, reason: 'session_unconfigured' };
  }
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(accessToken, key, {
      algorithms: ['HS256'],
      issuer: ADMIN_SESSION_ISSUER,
      audience: ADMIN_SESSION_AUDIENCE,
      clockTolerance: 120,
    });
    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('did:')) {
      return { ok: false, reason: 'sub' };
    }
    const adminHandle = adminHandleFromEnv(env);
    const want = adminHandle.toLowerCase().replace(/^@/, '');
    const adminDid = pinnedAdminDidFromEnv(env) ?? (await resolveAtHandleToDid(want));
    if (adminDid == null || adminDid === '') {
      return { ok: false, reason: 'admin_handle' };
    }
    if (payload.sub !== adminDid) {
      return {
        ok: false,
        reason: 'forbidden',
        details: { token_sub: payload.sub, expected_did: adminDid },
      };
    }
    return { ok: true, sub: payload.sub };
  } catch {
    return { ok: false, reason: 'jwt_verify' };
  }
}

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
  const apiTok = env.ATDANCE_ADMIN_API_TOKEN?.trim();
  if (apiTok !== undefined && apiTok !== '') {
    const be = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (be !== null) {
      const bearerSecret = be[1]!.trim();
      if (timingSafeEqualUtf8(bearerSecret, apiTok)) {
        const want = adminHandleFromEnv(env);
        const adminDid = pinnedAdminDidFromEnv(env) ?? (await resolveAtHandleToDid(want));
        if (adminDid == null || adminDid === '') {
          return { ok: false, status: 403, reason: 'admin_handle' };
        }
        return { ok: true, sub: adminDid };
      }
      // Opaque operator token typo: do not run JWT verify (would surface as jwt_verify).
      if (!looksLikeCompactJwt(bearerSecret)) {
        return { ok: false, status: 403, reason: 'admin_api_token_mismatch' };
      }
    }
  }
  const m = /^(?:Bearer|DPoP)\s+(.+)$/i.exec(auth);
  if (m === null) {
    return { ok: false, status: 401, reason: 'missing_bearer' };
  }
  const token = m[1]!.trim();
  const sessionSecret = env.ATDANCE_ADMIN_SESSION_SECRET?.trim();
  if (sessionSecret !== undefined && sessionSecret !== '' && looksLikeAdminSessionToken(token)) {
    const s = await verifyAdminSessionAccessToken(token, env);
    if (s.ok) {
      return { ok: true, sub: s.sub };
    }
    return {
      ok: false,
      status: 403,
      reason: s.reason,
      ...(s.details !== undefined ? { details: s.details } : {}),
    };
  }
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
