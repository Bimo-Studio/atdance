export interface RelayWorkerEnv {
  readonly INVITE_ONLY?: string;
  readonly ATPROTO_ALLOWLIST_DIDS?: string;
  /** When set, KV holds the live allowlist (no redeploy for edits). */
  readonly ALLOWLIST_KV?: KVNamespace;
  /** Comma-separated origins, or `*` (default). */
  readonly ATDANCE_APP_ORIGINS?: string;
  /** Handle allowed to use admin APIs (default `distributed.camp`). */
  readonly ATDANCE_ADMIN_HANDLE?: string;
  /** Optional: pin admin account DID (avoids handle resolution drift vs OAuth `sub`). */
  readonly ATDANCE_ADMIN_DID?: string;
  /**
   * Optional: full URL of the OAuth AS JWKS document (overrides `jwks_uri` from issuer metadata).
   * Use when metadata points at an empty JWKS (e.g. some hosts return `{"keys":[]}` publicly).
   */
  readonly ATDANCE_OAUTH_AS_JWKS_URL?: string;
  /**
   * Optional: inline JWKS JSON (`{"keys":[...]}`) when the published `jwks_uri` has no keys.
   * Prefer rotating this secret when the AS rotates signing keys.
   */
  readonly ATDANCE_OAUTH_AS_JWKS_JSON?: string;
}
