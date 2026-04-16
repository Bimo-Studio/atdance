export interface RelayWorkerEnv {
  readonly INVITE_ONLY?: string;
  readonly ATPROTO_ALLOWLIST_DIDS?: string;
  /** When set, KV holds the live allowlist (no redeploy for edits). */
  readonly ALLOWLIST_KV?: KVNamespace;
  /** Comma-separated origins, or `*` (default). */
  readonly ATDANCE_APP_ORIGINS?: string;
  /** Handle allowed to use admin APIs (default `distributed.camp`). */
  readonly ATDANCE_ADMIN_HANDLE?: string;
}
