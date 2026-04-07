/**
 * Cloudflare Worker: WebSocket relay for queue pairing + NTP-style ping/pong (plan Phase 4.2).
 * Deploy: pnpm relay:deploy
 *
 * **Never** write `CF-Connecting-IP` (or any IP) into structured JSON log lines (PRD §9).
 */
import { parseSyncMessageV1 } from '../../src/sync/syncMessageV1';
import { parseRelayInviteEnv } from './inviteAllowlist';
import { parseSyncPingPayload } from './protocol';
import { allowJoinForIp, createJoinRateState, type JoinRateState } from './rateLimit';
import { formatRelayLogLine } from './relayLogPayload';
import {
  applyRelayMessage,
  createRelayState,
  disconnectClient,
  type RelayState,
} from './relayState';

const JOIN_PER_MINUTE = 20;
const JOIN_WINDOW_MS = 60_000;

export interface RelayWorkerEnv {
  readonly INVITE_ONLY?: string;
  readonly ATPROTO_ALLOWLIST_DIDS?: string;
}

let relayState: RelayState = createRelayState();
let joinRateState: JoinRateState = createJoinRateState();
/** clientId → server-side WebSocket for that connection */
const clientSockets = new Map<string, WebSocket>();
const socketToClientId = new Map<WebSocket, string>();

function sendToClient(clientId: string, message: unknown): void {
  const ws = clientSockets.get(clientId);
  if (ws !== undefined && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function newTraceId(): string {
  return crypto.randomUUID();
}

export default {
  async fetch(request: Request, env: RelayWorkerEnv): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('ATDance relay — WebSocket (queue + clock sync)', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    const invite = parseRelayInviteEnv(env);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();

    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';

    server.addEventListener('message', (event: MessageEvent) => {
      const text = typeof event.data === 'string' ? event.data : '';
      const parsed = parseSyncMessageV1(text);
      if (parsed !== null) {
        if (parsed.type === 'ping') {
          const t2 = Date.now();
          const t3 = Date.now();
          server.send(
            JSON.stringify({
              type: 'pong',
              id: parsed.id,
              t1: parsed.t1,
              t2,
              t3,
            }),
          );
          return;
        }
        if (parsed.type === 'joinQueue') {
          const rl = allowJoinForIp(
            joinRateState,
            clientIp,
            Date.now(),
            JOIN_PER_MINUTE,
            JOIN_WINDOW_MS,
          );
          if (!rl.allowed) {
            server.send(JSON.stringify({ type: 'error', code: 'rate_limit' }));
            return;
          }
          joinRateState = rl.state;

          console.log(
            formatRelayLogLine({
              evt: 'relay_queue_join',
              traceId: newTraceId(),
              clientId: parsed.clientId,
              playerDid: parsed.playerDid,
              phase: 'queue',
            }),
          );

          const r = applyRelayMessage(relayState, parsed.clientId, parsed, invite);
          relayState = r.state;
          if (!clientSockets.has(parsed.clientId)) {
            clientSockets.set(parsed.clientId, server);
            socketToClientId.set(server, parsed.clientId);
          }
          for (const e of r.effects) {
            sendToClient(e.toClientId, e.message);
            if (e.message.type === 'paired') {
              const room = relayState.rooms.get(e.message.roomId);
              console.log(
                formatRelayLogLine({
                  evt: 'relay_paired',
                  traceId: newTraceId(),
                  roomId: e.message.roomId,
                  peerClientId: e.message.peerClientId,
                  phase: 'queue',
                }),
              );
              console.log(
                formatRelayLogLine({
                  evt: 'match_probe',
                  traceId: newTraceId(),
                  phase: 'probe',
                  matchId: e.message.roomId,
                  localDid: room?.didA,
                  remoteDid: room?.didB,
                  rttMeanMs: 0,
                  rttP95Ms: 0,
                  jitterStdMs: 0,
                  decision: 'accept',
                }),
              );
            }
          }
          return;
        }

        const senderId = socketToClientId.get(server);
        if (senderId === undefined) {
          return;
        }
        const r = applyRelayMessage(relayState, senderId, parsed, invite);
        relayState = r.state;
        for (const e of r.effects) {
          sendToClient(e.toClientId, e.message);
        }
        return;
      }

      const ping = parseSyncPingPayload(text);
      if (ping === null) {
        return;
      }
      const t2 = Date.now();
      const t3 = Date.now();
      server.send(
        JSON.stringify({
          type: 'pong',
          id: ping.id,
          t1: ping.t1,
          t2,
          t3,
        }),
      );
    });

    server.addEventListener('close', () => {
      const id = socketToClientId.get(server);
      if (id === undefined) {
        return;
      }
      socketToClientId.delete(server);
      clientSockets.delete(id);
      const r = disconnectClient(relayState, id);
      relayState = r.state;
      for (const e of r.effects) {
        sendToClient(e.toClientId, e.message);
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  },
};
