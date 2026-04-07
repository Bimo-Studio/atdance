import { parseViteP2PBootstrap } from '@/p2p/bootstrapUrl';

/**
 * True when `VITE_P2P_BOOTSTRAP` parses — P2P topic discovery is available (PRD §8.2).
 * Relay pairing remains the dev/default path when the relay URL is set.
 */
export function isP2PBootstrapConfigured(): boolean {
  return parseViteP2PBootstrap(import.meta.env.VITE_P2P_BOOTSTRAP).ok;
}
