/**
 * Pure relay queue / room state (plan Phase 4.2).
 * Worker maps WebSocket ↔ clientId and applies effects by sending JSON.
 */
import type { SyncMessageV1 } from '../../src/sync/syncMessageV1';

export interface RelayRoom {
  readonly roomId: string;
  readonly a: string;
  readonly b: string;
  /** From last `joinQueue.playerDid` for §9 `match_probe` logs (optional). */
  readonly didA?: string;
  readonly didB?: string;
}

export interface RelayState {
  readonly queue: readonly string[];
  readonly rooms: ReadonlyMap<string, RelayRoom>;
  readonly clientRoom: ReadonlyMap<string, string>;
  readonly nextRoomSeq: number;
  /** Queue clients only — cleared when paired or removed from queue. */
  readonly clientPlayerDid: ReadonlyMap<string, string>;
}

export interface RelayEffect {
  readonly toClientId: string;
  readonly message: SyncMessageV1;
}

/** When `inviteOnly`, `joinQueue` must carry an allowed `playerDid` (PRD P5). */
export interface RelayInviteContext {
  readonly inviteOnly: boolean;
  readonly allowedDids: ReadonlySet<string>;
}

type MutableState = {
  queue: string[];
  rooms: Map<string, RelayRoom>;
  clientRoom: Map<string, string>;
  nextRoomSeq: number;
  clientPlayerDid: Map<string, string>;
};

export function createRelayState(): RelayState {
  return {
    queue: [],
    rooms: new Map(),
    clientRoom: new Map(),
    nextRoomSeq: 0,
    clientPlayerDid: new Map(),
  };
}

function toMutable(s: RelayState): MutableState {
  return {
    queue: [...s.queue],
    rooms: new Map(s.rooms),
    clientRoom: new Map(s.clientRoom),
    nextRoomSeq: s.nextRoomSeq,
    clientPlayerDid: new Map(s.clientPlayerDid),
  };
}

function freezeState(m: MutableState): RelayState {
  return {
    queue: [...m.queue],
    rooms: new Map(m.rooms),
    clientRoom: new Map(m.clientRoom),
    nextRoomSeq: m.nextRoomSeq,
    clientPlayerDid: new Map(m.clientPlayerDid),
  };
}

export function applyRelayMessage(
  state: RelayState,
  senderClientId: string,
  msg: SyncMessageV1,
  invite?: RelayInviteContext,
): { state: RelayState; effects: RelayEffect[] } {
  const m = toMutable(state);

  if (msg.type === 'joinQueue') {
    if (msg.clientId !== senderClientId) {
      return { state, effects: [] };
    }
    if (invite?.inviteOnly) {
      const did = msg.playerDid?.trim();
      if (did === undefined || did === '' || !did.startsWith('did:')) {
        return {
          state,
          effects: [
            {
              toClientId: senderClientId,
              message: { type: 'error', code: 'invite_only' },
            },
          ],
        };
      }
      if (!invite.allowedDids.has(did)) {
        return {
          state,
          effects: [
            { toClientId: senderClientId, message: { type: 'error', code: 'invite_only' } },
          ],
        };
      }
    }
    if (m.clientRoom.has(senderClientId) || m.queue.includes(senderClientId)) {
      return { state, effects: [] };
    }
    m.queue.push(senderClientId);
    const trimmedDid = msg.playerDid?.trim();
    if (trimmedDid !== undefined && trimmedDid !== '') {
      m.clientPlayerDid.set(senderClientId, trimmedDid);
    }
    if (m.queue.length < 2) {
      return { state: freezeState(m), effects: [] };
    }
    const a = m.queue.shift()!;
    const b = m.queue.shift()!;
    const roomId = `room-${m.nextRoomSeq}`;
    m.nextRoomSeq += 1;
    const didA = m.clientPlayerDid.get(a);
    const didB = m.clientPlayerDid.get(b);
    m.clientPlayerDid.delete(a);
    m.clientPlayerDid.delete(b);
    m.rooms.set(roomId, {
      roomId,
      a,
      b,
      didA,
      didB,
    });
    m.clientRoom.set(a, roomId);
    m.clientRoom.set(b, roomId);
    const effects: RelayEffect[] = [
      { toClientId: a, message: { type: 'paired', roomId, peerClientId: b } },
      { toClientId: b, message: { type: 'paired', roomId, peerClientId: a } },
    ];
    return { state: freezeState(m), effects };
  }

  if (msg.type === 'leave') {
    return removeClient(m, senderClientId, msg.roomId);
  }

  if (msg.type === 'syncSample') {
    const roomId = m.clientRoom.get(senderClientId);
    if (!roomId) {
      return { state, effects: [] };
    }
    const room = m.rooms.get(roomId);
    if (!room) {
      return { state, effects: [] };
    }
    const peer = room.a === senderClientId ? room.b : room.a;
    return { state, effects: [{ toClientId: peer, message: msg }] };
  }

  return { state, effects: [] };
}

export function disconnectClient(
  state: RelayState,
  clientId: string,
): { state: RelayState; effects: RelayEffect[] } {
  const m = toMutable(state);
  return removeClient(m, clientId, undefined);
}

function removeClient(
  m: MutableState,
  clientId: string,
  _roomIdHint: string | undefined,
): { state: RelayState; effects: RelayEffect[] } {
  const effects: RelayEffect[] = [];

  const qIdx = m.queue.indexOf(clientId);
  if (qIdx >= 0) {
    m.queue.splice(qIdx, 1);
    m.clientPlayerDid.delete(clientId);
    return { state: freezeState(m), effects: [] };
  }

  const roomId = m.clientRoom.get(clientId);
  if (!roomId) {
    return { state: freezeState(m), effects: [] };
  }

  const room = m.rooms.get(roomId);
  if (!room) {
    m.clientRoom.delete(clientId);
    return { state: freezeState(m), effects: [] };
  }

  const peer = room.a === clientId ? room.b : room.a;
  m.rooms.delete(roomId);
  m.clientRoom.delete(room.a);
  m.clientRoom.delete(room.b);
  effects.push({ toClientId: peer, message: { type: 'leave', roomId } });
  return { state: freezeState(m), effects };
}
