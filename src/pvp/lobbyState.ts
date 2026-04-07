export type PvpLobbyState =
  | 'idle'
  | 'matchmaking'
  | 'probing'
  | 'lobby'
  | 'countdown'
  | 'play'
  | 'end';

export type PvpLobbyEvent =
  | 'enter_queue'
  | 'pair_found'
  | 'probe_done'
  | 'both_ready'
  | 'countdown_end'
  | 'match_end'
  | 'cancel';

/**
 * Pure transition table (PRD P2). Unknown / invalid combinations keep `current`.
 *
 * | From ↓ / event → | enter_queue | pair_found | probe_done | both_ready | countdown_end | match_end | cancel |
 * |------------------|------------|------------|------------|------------|---------------|-----------|--------|
 * | idle             | matchmaking| —          | —          | —          | —             | —         | idle   |
 * | matchmaking      | —          | probing    | —          | —          | —             | —         | idle   |
 * | probing          | —          | —          | lobby      | —          | —             | —         | idle   |
 * | lobby            | —          | —          | —          | countdown  | —             | —         | idle   |
 * | countdown        | —          | —          | —          | —          | play          | —         | idle   |
 * | play             | —          | —          | —          | —          | —             | end       | idle   |
 * | end              | —          | —          | —          | —          | —             | end       | idle   |
 */
export function nextLobbyState(current: PvpLobbyState, event: PvpLobbyEvent): PvpLobbyState {
  switch (event) {
    case 'enter_queue':
      return current === 'idle' ? 'matchmaking' : current;
    case 'pair_found':
      return current === 'matchmaking' ? 'probing' : current;
    case 'probe_done':
      return current === 'probing' ? 'lobby' : current;
    case 'both_ready':
      return current === 'lobby' ? 'countdown' : current;
    case 'countdown_end':
      return current === 'countdown' ? 'play' : current;
    case 'match_end':
      return current === 'play' || current === 'end' ? 'end' : current;
    case 'cancel':
      return 'idle';
    default:
      return current;
  }
}
