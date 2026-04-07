/// <reference types="vite/client" />

/** Short git SHA; set in `vite.config.ts`. */
declare const __APP_GIT_SHA__: string;

interface ImportMetaEnv {
  /** When `1`, only DIDs listed in `VITE_ATPROTO_ALLOWLIST_DIDS` may play (PRD P5). */
  readonly VITE_INVITE_ONLY?: string;
  /** Comma-separated DIDs allowed when invite-only mode is on. */
  readonly VITE_ATPROTO_ALLOWLIST_DIDS?: string;
  readonly VITE_RELAY_WS?: string;
  /** P2P bootstrap `wss://` / `ws://` URLs (comma-separated or JSON array). See `docs/prd-p2p-sync.md`. */
  readonly VITE_P2P_BOOTSTRAP?: string;
  /** `p2p` to default Sync Lab to P2P spike (also use `?sync=p2p`). */
  readonly VITE_SYNC_LAB_MODE?: string;
}
