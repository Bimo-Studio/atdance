import { parseSyncMessageV1 } from '@/sync/syncMessageV1';

import { isE2eMode } from '@/util/e2eFlags';

/** Same resolution as Sync Lab (`SyncLabScene`): env, else dev default, else empty. */
export function getPvpRelayWsUrl(): string {
  const v = import.meta.env.VITE_RELAY_WS;
  if (typeof v === 'string' && v.length > 0) {
    return v;
  }
  if (import.meta.env.DEV) {
    return 'ws://127.0.0.1:8787';
  }
  return '';
}

export interface PvpRelayQueueSession {
  readonly close: () => void;
}

/**
 * Register in relay FIFO with `playerDid` (PRD §8.1). Skipped when no URL or `e2e=1` (deterministic tests).
 */
export function connectPvpRelayQueue(opts: {
  readonly relayWsUrl: string;
  readonly clientId: string;
  readonly playerDid: string;
  readonly onPaired: (msg: { readonly roomId: string; readonly peerClientId: string }) => void;
  readonly onError?: (code: string) => void;
}): PvpRelayQueueSession | null {
  if (opts.relayWsUrl === '' || isE2eMode()) {
    return null;
  }
  const ws = new WebSocket(opts.relayWsUrl);
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
      opts.onPaired({
        roomId: msg.roomId,
        peerClientId: msg.peerClientId ?? '',
      });
      return;
    }
    if (msg.type === 'error') {
      opts.onError?.(msg.code);
    }
  });
  return {
    close: () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}
