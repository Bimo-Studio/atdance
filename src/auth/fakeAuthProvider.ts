import type { OAuthSession } from '@atproto/oauth-client-browser';

import type { AuthProvider } from './authProvider';

/** In-memory session for unit tests and local-only flows. */
export class FakeAuthProvider implements AuthProvider {
  private session: OAuthSession | null = null;

  getSession(): Promise<OAuthSession | null> {
    return Promise.resolve(this.session);
  }

  setSession(session: OAuthSession | null): void {
    this.session = session;
  }
}
