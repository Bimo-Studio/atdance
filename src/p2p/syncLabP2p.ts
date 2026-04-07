import { createSwarmFromEnv, joinTopic } from '@/p2p/createSwarm';
import { isHyperswarmInitiator, type EchoDuplex } from '@/p2p/p2pEchoHandshake';
import {
  attachPongResponder,
  runNtpSampleBurstInitiator,
  waitForSocketClose,
} from '@/p2p/p2pNtpSample';
import { decideSyncLabPairing, type PairingState } from '@/p2p/pairingFirstTwo';
import { peerIdFromHyperswarmDetails } from '@/p2p/hyperswarmPeerId';
import { sha256TopicKey } from '@/p2p/topicKey';

export type SyncLabP2pLog = (line: string) => void;

function safeDestroyExtraConnection(socket: EchoDuplex): void {
  const s = socket as EchoDuplex & { destroy?: (cb?: () => void) => void };
  if (typeof s.destroy === 'function') {
    s.destroy();
  }
}

/**
 * P1 + P2: join SHA-256 topic, **first-two** peer pairing, NTP over JSON-line wire, destroy swarm.
 */
export async function runSyncLabP2pNtpProbe(opts: {
  topicLabel: string;
  onLog: SyncLabP2pLog;
  sampleCount?: number;
  /** Max wait for a peer to connect (ms). */
  connectionTimeoutMs?: number;
}): Promise<void> {
  const connectionTimeoutMs = opts.connectionTimeoutMs ?? 120_000;
  const sampleCount = opts.sampleCount ?? 10;
  const created = createSwarmFromEnv();
  if (!created.ok) {
    throw new Error(created.message);
  }
  const { swarm } = created;
  const topicKey = await sha256TopicKey(opts.topicLabel);
  joinTopic(swarm, topicKey);
  opts.onLog('P2P: joined topic (open second tab with same ?topic=)');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let connTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let pairingState: PairingState = { phase: 'empty' };
    let ntpStarted = false;

    const cleanup = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (connTimer !== undefined) {
        globalThis.clearTimeout(connTimer);
      }
      swarm.off('connection', onConnection);
      swarm.destroy(() => {
        action();
      });
    };

    const onConnection = (socket: EchoDuplex, details: unknown): void => {
      if (settled) {
        return;
      }

      const peerId = peerIdFromHyperswarmDetails(details);
      const decision = decideSyncLabPairing({ state: pairingState, ntpStarted, peerId });
      pairingState = decision.nextState;

      if (decision.kind === 'reject') {
        if (decision.reason === 'bad_peer_id') {
          opts.onLog('P2P: connection missing peer id (ignored)');
        } else if (decision.reason === 'ignored_duplicate') {
          opts.onLog('P2P: ignoring extra peer (first-two pairing)');
        } else {
          opts.onLog('P2P: ignoring late peer (NTP session already started)');
        }
        safeDestroyExtraConnection(socket);
        return;
      }

      ntpStarted = true;
      if (connTimer !== undefined) {
        globalThis.clearTimeout(connTimer);
        connTimer = undefined;
      }

      const initiator = isHyperswarmInitiator(details);
      opts.onLog(initiator ? 'P2P: connected (initiator)' : 'P2P: connected (responder)');

      if (initiator) {
        void runNtpSampleBurstInitiator(socket, {
          sampleCount,
          onLine: (line) => opts.onLog(line),
        })
          .then(() => {
            opts.onLog('P2P: NTP samples complete');
            cleanup(() => resolve());
          })
          .catch((e) => {
            cleanup(() => reject(e instanceof Error ? e : new Error(String(e))));
          });
        return;
      }

      const detach = attachPongResponder(socket);
      void waitForSocketClose(socket, { timeoutMs: connectionTimeoutMs })
        .then(() => {
          detach();
          opts.onLog('P2P: responder finished');
          cleanup(() => resolve());
        })
        .catch((e) => {
          detach();
          cleanup(() => reject(e instanceof Error ? e : new Error(String(e))));
        });
    };

    connTimer = globalThis.setTimeout(() => {
      cleanup(() => reject(new Error('P2P peer timeout — no connection')));
    }, connectionTimeoutMs);

    swarm.on('connection', onConnection);
  });
}
