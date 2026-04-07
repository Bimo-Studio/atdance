/**
 * Minimal client-side pairing: first two distinct peers win (PRD F6, P2.1).
 * Transport-agnostic state machine — tests prove ordering without WebRTC.
 */

export type PairingPhase = 'empty' | 'one' | 'paired';

export type PairingState =
  | { phase: 'empty' }
  | { phase: 'one'; firstPeerId: string }
  | { phase: 'paired'; peerA: string; peerB: string };

export type PairingEvent = 'waiting' | 'paired' | 'ignored_duplicate';

/**
 * When a peer is seen on the topic, transition toward first-two pairing.
 * Same id twice before pair: still waiting. Third distinct peer after pair: ignored.
 */
export type SyncLabPairingRejectReason =
  | 'ignored_duplicate'
  | 'ntp_already_started'
  | 'bad_peer_id';

/**
 * Whether Sync Lab may use this connection for NTP (first-two peers; ignore extras).
 * Updates pairing state from {@link applyPairingPeer}; rejects a third peer or a late join after NTP started.
 */
export function decideSyncLabPairing(opts: {
  state: PairingState;
  ntpStarted: boolean;
  peerId: string;
}):
  | { kind: 'accept'; nextState: PairingState }
  | { kind: 'reject'; nextState: PairingState; reason: SyncLabPairingRejectReason } {
  if (opts.peerId.length === 0) {
    return { kind: 'reject', nextState: opts.state, reason: 'bad_peer_id' };
  }
  const { next, event } = applyPairingPeer(opts.state, opts.peerId);
  if (event === 'ignored_duplicate') {
    return { kind: 'reject', nextState: next, reason: 'ignored_duplicate' };
  }
  if (opts.ntpStarted) {
    return { kind: 'reject', nextState: next, reason: 'ntp_already_started' };
  }
  return { kind: 'accept', nextState: next };
}

export function applyPairingPeer(
  state: PairingState,
  peerId: string,
): { next: PairingState; event: PairingEvent } {
  if (state.phase === 'paired') {
    return { next: state, event: 'ignored_duplicate' };
  }
  if (state.phase === 'empty') {
    return { next: { phase: 'one', firstPeerId: peerId }, event: 'waiting' };
  }
  if (state.firstPeerId === peerId) {
    return { next: state, event: 'waiting' };
  }
  return {
    next: { phase: 'paired', peerA: state.firstPeerId, peerB: peerId },
    event: 'paired',
  };
}
