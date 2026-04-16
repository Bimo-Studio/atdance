import { type PvpMessageV1, parsePvpMessageV1, stringifyPvpMessageV1 } from '@/pvp/pvpMessageV1';
import { parseSyncMessageV1, type SyncMessageV1 } from '@/sync/syncMessageV1';

import { isE2eMode } from '@/util/e2eFlags';

export { getPvpRelayWsUrl } from '@/pvp/pvpRelayQueue';

export interface PvpRelaySession {
  readonly close: () => void;
  /**
   * Send a PvP wire message via relay (`pvpWire`); no-op if not paired or socket closed.
   */
  readonly sendPvp: (msg: PvpMessageV1) => void;
  /** Register handler for inbound PvP messages (from `pvpWire.body`). Pass null to clear. */
  readonly setOnPvpMessage: (handler: ((msg: PvpMessageV1) => void) | null) => void;
  readonly getRoomId: () => string | null;
}

/**
 * FIFO queue join + **persistent** WebSocket for `pvpWire` after `paired` (tasks N.4).
 * Skipped when no URL or `e2e=1`.
 */
export function connectPvpRelaySession(opts: {
  readonly relayWsUrl: string;
  readonly clientId: string;
  readonly playerDid: string;
  readonly onPaired: (msg: {
    readonly roomId: string;
    readonly peerClientId: string;
    readonly peerPlayerDid?: string;
  }) => void;
  readonly onError?: (code: string) => void;
}): PvpRelaySession | null {
  if (opts.relayWsUrl === '' || isE2eMode()) {
    return null;
  }

  let roomId: string | null = null;
  let onPvp: ((msg: PvpMessageV1) => void) | null = null;
  let pairedFired = false;

  const ws = new WebSocket(opts.relayWsUrl);

  const deliverSyncToHandler = (msg: SyncMessageV1): void => {
    if (msg.type !== 'pvpWire' || onPvp === null) {
      return;
    }
    if (roomId === null || msg.roomId !== roomId) {
      return;
    }
    const inner = parsePvpMessageV1(msg.body);
    if (inner !== null) {
      onPvp(inner);
    }
  };

  ws.addEventListener('open', () => {
    ws.send(
      JSON.stringify({
        type: 'joinQueue',
        clientId: opts.clientId,
        playerDid: opts.playerDid,
      }),
    );
  });

  ws.addEventListener('message', (ev: MessageEvent) => {
    const text = typeof ev.data === 'string' ? ev.data : '';
    const msg = parseSyncMessageV1(text);
    if (msg === null) {
      return;
    }
    if (msg.type === 'paired') {
      roomId = msg.roomId;
      if (!pairedFired) {
        pairedFired = true;
        opts.onPaired({
          roomId: msg.roomId,
          peerClientId: msg.peerClientId ?? '',
          peerPlayerDid: msg.peerPlayerDid,
        });
      }
      return;
    }
    if (msg.type === 'error') {
      opts.onError?.(msg.code);
      return;
    }
    deliverSyncToHandler(msg);
  });

  return {
    close: () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      roomId = null;
      onPvp = null;
    },
    getRoomId: () => roomId,
    sendPvp: (pvp: PvpMessageV1) => {
      const id = roomId;
      if (id === null || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const body = stringifyPvpMessageV1(pvp);
      ws.send(
        JSON.stringify({
          type: 'pvpWire',
          roomId: id,
          body,
        } satisfies Extract<SyncMessageV1, { type: 'pvpWire' }>),
      );
    },
    setOnPvpMessage: (handler) => {
      onPvp = handler;
    },
  };
}
