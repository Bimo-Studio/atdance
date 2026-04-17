import { describe, expect, it } from 'vitest';

import { handleRelayHttp } from './relayHttp';

describe('relay admin session HTTP', () => {
  it('GET /admin/session/v1/options reflects password env', async () => {
    const withPwd = new Request('https://relay.test/admin/session/v1/options', {
      headers: { Origin: 'https://app.test' },
    });
    const a = await handleRelayHttp(withPwd, {
      ATDANCE_APP_ORIGINS: '*',
      ATDANCE_ADMIN_PASSWORD: 'x',
    });
    expect(await a.json()).toEqual({ passwordLogin: true });

    const noPwd = new Request('https://relay.test/admin/session/v1/options', {
      headers: { Origin: 'https://app.test' },
    });
    const b = await handleRelayHttp(noPwd, {
      ATDANCE_APP_ORIGINS: '*',
    });
    expect(await b.json()).toEqual({ passwordLogin: false });
  });

  it('POST /admin/session/v1/login returns access_token when password matches', async () => {
    const req = new Request('https://relay.test/admin/session/v1/login', {
      method: 'POST',
      headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'correct' }),
    });
    const res = await handleRelayHttp(req, {
      ATDANCE_APP_ORIGINS: '*',
      ATDANCE_ADMIN_PASSWORD: 'correct',
      ATDANCE_ADMIN_SESSION_SECRET: 's'.repeat(32),
      ATDANCE_ADMIN_DID: 'did:plc:admin',
    });
    expect(res.ok).toBe(true);
    const j = (await res.json()) as { access_token?: string; token_type?: string };
    expect(typeof j.access_token).toBe('string');
    expect(j.access_token?.split('.').length).toBe(3);
    expect(j.token_type).toBe('Bearer');
  });

  it('POST login returns 401 when password wrong', async () => {
    const req = new Request('https://relay.test/admin/session/v1/login', {
      method: 'POST',
      headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    const res = await handleRelayHttp(req, {
      ATDANCE_APP_ORIGINS: '*',
      ATDANCE_ADMIN_PASSWORD: 'correct',
      ATDANCE_ADMIN_SESSION_SECRET: 's'.repeat(32),
      ATDANCE_ADMIN_DID: 'did:plc:admin',
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('POST login returns 503 when session secret missing', async () => {
    const req = new Request('https://relay.test/admin/session/v1/login', {
      method: 'POST',
      headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'p' }),
    });
    const res = await handleRelayHttp(req, {
      ATDANCE_APP_ORIGINS: '*',
      ATDANCE_ADMIN_PASSWORD: 'p',
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'admin_session_secret_unconfigured' });
  });
});
