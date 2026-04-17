import {
  adminHandleFromEnv,
  mintAdminSessionJwt,
  requireAdminBearer,
  verifyAdminPlainPassword,
} from './adminVerify';
import {
  adminAddEntry,
  adminRemoveDid,
  getEffectiveAllowlist,
  type AllowlistRow,
} from './allowlistStore';
import { fetchBskyHandleForDid, resolveAtHandleToDid } from './bskyPublic';
import type { RelayWorkerEnv } from './workerEnv';

/** Strip trailing `/` so `https://app/` in env matches browser `Origin: https://app`. */
function normalizeBrowserOrigin(o: string): string {
  return o.trim().replace(/\/$/, '');
}

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === '') {
    return ['*'];
  }
  return raw
    .split(',')
    .map((s) => normalizeBrowserOrigin(s))
    .filter(Boolean);
}

function corsHeaders(request: Request, env: RelayWorkerEnv): Record<string, string> {
  const originRaw = request.headers.get('Origin');
  const origin = originRaw === null ? null : normalizeBrowserOrigin(originRaw);
  const list = parseAllowedOrigins(env.ATDANCE_APP_ORIGINS);
  let allow: string | null = null;
  if (list.includes('*')) {
    allow = origin ?? '*';
  } else if (origin !== null && list.includes(origin)) {
    allow = origin;
  }
  const h: Record<string, string> = {
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
  if (allow !== null) {
    h['access-control-allow-origin'] = allow;
    h['access-control-allow-headers'] = 'authorization, content-type, dpop';
    h['access-control-allow-methods'] = 'GET, POST, OPTIONS';
  }
  return h;
}

function json(data: unknown, init: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status: init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors },
  });
}

function adminAuthJson(
  admin: { reason: string; details?: { token_sub: string; expected_did: string } },
  status: number,
  cors: Record<string, string>,
): Response {
  const body: Record<string, unknown> = { error: 'admin_auth_failed', reason: admin.reason };
  if (admin.details !== undefined) {
    body.token_sub = admin.details.token_sub;
    body.expected_did = admin.details.expected_did;
  }
  return json(body, status, cors);
}

async function parseAddBody(body: unknown): Promise<AllowlistRow | null> {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const o = body as { did?: string; handle?: string };
  const didRaw = typeof o.did === 'string' ? o.did.trim() : '';
  const handleRaw = typeof o.handle === 'string' ? o.handle.trim().replace(/^@/, '') : '';
  if (didRaw.startsWith('did:')) {
    let h = handleRaw.toLowerCase();
    if (h === '') {
      const prof = await fetchBskyHandleForDid(didRaw);
      h = prof ?? '';
    }
    return { did: didRaw, handle: h };
  }
  if (handleRaw !== '') {
    const did = await resolveAtHandleToDid(handleRaw);
    if (did === null) {
      return null;
    }
    return { did, handle: handleRaw.toLowerCase() };
  }
  return null;
}

export async function handleRelayHttp(request: Request, env: RelayWorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (path === '/admin/session/v1/options' && request.method === 'GET') {
    const raw = env.ATDANCE_ADMIN_PASSWORD?.trim() ?? '';
    return json({ passwordLogin: raw !== '' }, 200, cors);
  }

  if (path === '/admin/session/v1/login' && request.method === 'POST') {
    const pwdConfigured = (env.ATDANCE_ADMIN_PASSWORD?.trim() ?? '') !== '';
    if (!pwdConfigured) {
      return json({ error: 'admin_login_unconfigured' }, 503, cors);
    }
    const sessSecret = env.ATDANCE_ADMIN_SESSION_SECRET?.trim() ?? '';
    if (sessSecret === '') {
      return json({ error: 'admin_session_secret_unconfigured' }, 503, cors);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_json' }, 400, cors);
    }
    const password =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { password?: string }).password === 'string'
        ? (body as { password: string }).password
        : '';
    if (!verifyAdminPlainPassword(env, password)) {
      return json({ error: 'invalid_credentials' }, 401, cors);
    }
    const accessToken = await mintAdminSessionJwt(env);
    if (accessToken === null) {
      return json({ error: 'admin_session_mint_failed' }, 503, cors);
    }
    return json({ access_token: accessToken, token_type: 'Bearer', expires_in: 14_400 }, 200, cors);
  }

  if (path === '/allowlist/v1/check' && request.method === 'GET') {
    const did = url.searchParams.get('did')?.trim() ?? '';
    if (!did.startsWith('did:')) {
      return json({ error: 'bad_did' }, 400, cors);
    }
    const eff = await getEffectiveAllowlist(env.ALLOWLIST_KV, env);
    return json({ allowed: eff.allowedDids.has(did), version: eff.version }, 200, cors);
  }

  if (path === '/admin/allowlist/v1' && request.method === 'GET') {
    const admin = await requireAdminBearer(request, env);
    if (!admin.ok) {
      return adminAuthJson(admin, admin.status, cors);
    }
    const eff = await getEffectiveAllowlist(env.ALLOWLIST_KV, env);
    return json(
      {
        adminHandle: adminHandleFromEnv(env),
        version: eff.version,
        entries: eff.entries,
      },
      200,
      cors,
    );
  }

  if (path === '/admin/allowlist/v1/add' && request.method === 'POST') {
    if (env.ALLOWLIST_KV === undefined) {
      return json({ error: 'allowlist_kv_unconfigured' }, 503, cors);
    }
    const admin = await requireAdminBearer(request, env);
    if (!admin.ok) {
      return adminAuthJson(admin, admin.status, cors);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_json' }, 400, cors);
    }
    const row = await parseAddBody(body);
    if (row === null) {
      return json({ error: 'bad_body' }, 400, cors);
    }
    const eff = await adminAddEntry(env.ALLOWLIST_KV, env, row);
    return json({ ok: true, version: eff.version, entries: eff.entries }, 200, cors);
  }

  if (path === '/admin/allowlist/v1/remove' && request.method === 'POST') {
    if (env.ALLOWLIST_KV === undefined) {
      return json({ error: 'allowlist_kv_unconfigured' }, 503, cors);
    }
    const admin = await requireAdminBearer(request, env);
    if (!admin.ok) {
      return adminAuthJson(admin, admin.status, cors);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_json' }, 400, cors);
    }
    const did =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { did?: string }).did === 'string'
        ? (body as { did: string }).did.trim()
        : '';
    if (!did.startsWith('did:')) {
      return json({ error: 'bad_did' }, 400, cors);
    }
    const next = await adminRemoveDid(env.ALLOWLIST_KV, env, did);
    if (next === null) {
      return json({ error: 'not_found' }, 404, cors);
    }
    return json({ ok: true, version: next.version, entries: next.entries }, 200, cors);
  }

  return new Response('ATDance relay — HTTP allowlist + WebSocket', {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...cors },
  });
}
