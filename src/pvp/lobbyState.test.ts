import { describe, expect, it } from 'vitest';

import { nextLobbyState, type PvpLobbyEvent, type PvpLobbyState } from '@/pvp/lobbyState';

const states: PvpLobbyState[] = [
  'idle',
  'matchmaking',
  'probing',
  'lobby',
  'countdown',
  'play',
  'end',
];

const events: PvpLobbyEvent[] = [
  'enter_queue',
  'pair_found',
  'probe_done',
  'both_ready',
  'countdown_end',
  'match_end',
  'cancel',
];

describe('nextLobbyState', () => {
  it('happy path: idle → matchmaking → probing → lobby → countdown → play → end', () => {
    let s = nextLobbyState('idle', 'enter_queue');
    expect(s).toBe('matchmaking');
    s = nextLobbyState(s, 'pair_found');
    expect(s).toBe('probing');
    s = nextLobbyState(s, 'probe_done');
    expect(s).toBe('lobby');
    s = nextLobbyState(s, 'both_ready');
    expect(s).toBe('countdown');
    s = nextLobbyState(s, 'countdown_end');
    expect(s).toBe('play');
    s = nextLobbyState(s, 'match_end');
    expect(s).toBe('end');
    s = nextLobbyState(s, 'match_end');
    expect(s).toBe('end');
  });

  it('cancel returns idle from any non-terminal flow state', () => {
    for (const st of states) {
      if (st === 'end') {
        expect(nextLobbyState(st, 'cancel')).toBe('idle');
      } else {
        expect(nextLobbyState(st, 'cancel')).toBe('idle');
      }
    }
  });

  it('enter_queue only advances from idle', () => {
    expect(nextLobbyState('idle', 'enter_queue')).toBe('matchmaking');
    expect(nextLobbyState('matchmaking', 'enter_queue')).toBe('matchmaking');
    expect(nextLobbyState('lobby', 'enter_queue')).toBe('lobby');
  });

  it('pair_found only from matchmaking', () => {
    expect(nextLobbyState('matchmaking', 'pair_found')).toBe('probing');
    expect(nextLobbyState('idle', 'pair_found')).toBe('idle');
    expect(nextLobbyState('probing', 'pair_found')).toBe('probing');
  });

  it('probe_done only from probing', () => {
    expect(nextLobbyState('probing', 'probe_done')).toBe('lobby');
    expect(nextLobbyState('matchmaking', 'probe_done')).toBe('matchmaking');
  });

  it('both_ready only from lobby', () => {
    expect(nextLobbyState('lobby', 'both_ready')).toBe('countdown');
    expect(nextLobbyState('probing', 'both_ready')).toBe('probing');
  });

  it('countdown_end only from countdown', () => {
    expect(nextLobbyState('countdown', 'countdown_end')).toBe('play');
    expect(nextLobbyState('lobby', 'countdown_end')).toBe('lobby');
  });

  it('match_end only from play (or idempotent end)', () => {
    expect(nextLobbyState('play', 'match_end')).toBe('end');
    expect(nextLobbyState('lobby', 'match_end')).toBe('lobby');
    expect(nextLobbyState('countdown', 'match_end')).toBe('countdown');
    expect(nextLobbyState('end', 'match_end')).toBe('end');
  });

  it('unknown combinations are no-ops (snapshot table)', () => {
    for (const st of states) {
      for (const ev of events) {
        const next = nextLobbyState(st, ev);
        const valid =
          (ev === 'cancel' && next === 'idle') ||
          (ev === 'enter_queue' && st === 'idle' && next === 'matchmaking') ||
          (ev === 'pair_found' && st === 'matchmaking' && next === 'probing') ||
          (ev === 'probe_done' && st === 'probing' && next === 'lobby') ||
          (ev === 'both_ready' && st === 'lobby' && next === 'countdown') ||
          (ev === 'countdown_end' && st === 'countdown' && next === 'play') ||
          (ev === 'match_end' && (st === 'play' || st === 'end') && next === 'end') ||
          next === st;
        expect(valid, `${st} + ${ev} → ${next}`).toBe(true);
      }
    }
  });
});
