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
