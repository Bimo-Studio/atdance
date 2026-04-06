/**
 * Abstraction over ATProto OAuth session (plan Phase 3.2).
 * Real implementation uses `@atproto/oauth-client-browser`; tests use `FakeAuthProvider`.
 */
import type { OAuthSession } from '@atproto/oauth-client-browser';

export interface AuthProvider {
  /** Active OAuth session, or null when anonymous. */
  getSession(): Promise<OAuthSession | null>;
}
