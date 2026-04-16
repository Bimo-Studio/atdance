/// <reference types="vite/client" />

/** Short git SHA; set in `vite.config.ts`. */
declare const __APP_GIT_SHA__: string;

interface ImportMetaEnv {
  /** Override OAuth `client_id` (HTTPS URL of client metadata JSON). Default: `${origin}/oauth-client-metadata.json`. */
  readonly VITE_ATPROTO_OAUTH_CLIENT_ID?: string;
  /**
   * Public app origin for build-time OAuth metadata when not on Vercel/CF (e.g. `https://staging.example.com`).
   * Vercel sets `VERCEL_URL`; Cloudflare Pages sets `CF_PAGES_URL` during build.
   */
  readonly VITE_PUBLIC_APP_ORIGIN?: string;
  /** When `1`, only DIDs listed in `VITE_ATPROTO_ALLOWLIST_DIDS` may play (PRD P5). */
  readonly VITE_INVITE_ONLY?: string;
  /** Comma-separated DIDs allowed when invite-only mode is on. */
  readonly VITE_ATPROTO_ALLOWLIST_DIDS?: string;
  readonly VITE_RELAY_WS?: string;
  /** Optional relay HTTPS origin when it cannot be derived from `VITE_RELAY_WS` (e.g. TLS terminator path). */
  readonly VITE_RELAY_HTTP?: string;
  /** P2P bootstrap `wss://` / `ws://` URLs (comma-separated or JSON array). See `docs/prd-p2p-sync.md`. */
  readonly VITE_P2P_BOOTSTRAP?: string;
  /** `p2p` to default Sync Lab to P2P spike (also use `?sync=p2p`). */
  readonly VITE_SYNC_LAB_MODE?: string;
  /** When `1`, use P2P duplex for RTT probe when a socket is wired (P3.5b). */
  readonly VITE_PVP_P2P_PROBE?: string;
}
