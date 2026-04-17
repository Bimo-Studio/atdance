import { describe, expect, it } from 'vitest';

import { mintAdminSessionJwt, requireAdminBearer } from './adminVerify';

describe('admin session JWT (integration)', () => {
  it('minted token is accepted by requireAdminBearer', async () => {
    const env = {
      ATDANCE_ADMIN_SESSION_SECRET: 'integration-test-secret-32bytes!!',
      ATDANCE_ADMIN_DID: 'did:plc:admintest',
      ATDANCE_ADMIN_HANDLE: 'distributed.camp',
    };
    const tok = await mintAdminSessionJwt(env);
    expect(tok).not.toBeNull();
    const req = new Request('https://relay.test/admin/allowlist/v1', {
      headers: { Authorization: `Bearer ${tok}` },
    });
    await expect(requireAdminBearer(req, env)).resolves.toEqual({
      ok: true,
      sub: 'did:plc:admintest',
    });
  });
});
