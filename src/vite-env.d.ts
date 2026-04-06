/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELAY_WS?: string;
  /** P2P bootstrap `wss://` / `ws://` URLs (comma-separated or JSON array). See `docs/prd-p2p-sync.md`. */
  readonly VITE_P2P_BOOTSTRAP?: string;
}
