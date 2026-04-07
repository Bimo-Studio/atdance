/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELAY_WS?: string;
  /** P2P bootstrap `wss://` / `ws://` URLs (comma-separated or JSON array). See `docs/prd-p2p-sync.md`. */
  readonly VITE_P2P_BOOTSTRAP?: string;
  /** `p2p` to default Sync Lab to P2P spike (also use `?sync=p2p`). */
  readonly VITE_SYNC_LAB_MODE?: string;
}
