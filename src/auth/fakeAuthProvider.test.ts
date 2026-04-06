import type { OAuthSession } from '@atproto/oauth-client-browser';
import { describe, expect, it } from 'vitest';

import { FakeAuthProvider } from './fakeAuthProvider';

describe('FakeAuthProvider', () => {
  it('returns null until a session is set', async () => {
    const auth = new FakeAuthProvider();
    expect(await auth.getSession()).toBeNull();
  });

  it('returns the session set via setSession', async () => {
    const auth = new FakeAuthProvider();
    const mock = { sub: 'did:plc:testfake' } as unknown as OAuthSession;
    auth.setSession(mock);
    expect(await auth.getSession()).toBe(mock);
    auth.setSession(null);
    expect(await auth.getSession()).toBeNull();
  });
});
