import { Buffer } from 'buffer';
import createSwarm from 'hyperswarm-web';

import { parseViteP2PBootstrap } from '@/p2p/bootstrapUrl';
import { normalizeHyperswarmBootstrapBases } from '@/p2p/bootstrapNormalize';
import { buildIceServers } from '@/p2p/iceConfig';

import type { HyperswarmWebInstance } from 'hyperswarm-web';

export type CreateSwarmResult =
  | { ok: true; swarm: HyperswarmWebInstance }
  | { ok: false; message: string };

/**
 * Create a browser swarm from `VITE_P2P_BOOTSTRAP` (base `ws://` / `wss://` URLs, no `/proxy` suffix required).
 */
export function createSwarmFromEnv(): CreateSwarmResult {
  const raw = import.meta.env.VITE_P2P_BOOTSTRAP;
  const parsed = parseViteP2PBootstrap(typeof raw === 'string' ? raw : undefined);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  const bootstrap = normalizeHyperswarmBootstrapBases(parsed.urls);
  const iceServers = buildIceServers({});
  const swarm = createSwarm({
    bootstrap,
    simplePeer: {
      config: {
        iceServers,
      },
    },
    maxPeers: 8,
  });
  return { ok: true, swarm };
}

/** Join topic: Hyperswarm expects a Buffer-like key. */
export function joinTopic(swarm: HyperswarmWebInstance, topicKey32: Uint8Array): void {
  swarm.join(Buffer.from(topicKey32));
}
