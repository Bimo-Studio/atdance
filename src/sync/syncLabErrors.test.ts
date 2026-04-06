import { describe, expect, it } from 'vitest';

import { describeWebSocketClose, formatSyncLabUserError, relayDevHint } from '@/sync/syncLabErrors';

describe('relayDevHint', () => {
  it('mentions wrangler dev and local port', () => {
    expect(relayDevHint()).toContain('relay:dev');
    expect(relayDevHint()).toContain('8787');
  });
});

describe('describeWebSocketClose', () => {
  it('explains normal closure', () => {
    expect(describeWebSocketClose(1000, '')).toMatch(/normal|clean/i);
  });

  it('explains abnormal closure without code', () => {
    expect(describeWebSocketClose(1006, '')).toMatch(/abnormal|lost|no status/i);
  });

  it('includes close reason when present', () => {
    expect(describeWebSocketClose(4000, 'rate_limit')).toContain('rate_limit');
  });
});

describe('formatSyncLabUserError', () => {
  it('maps generic websocket failure to relay hint when dev or url configured', () => {
    const a = formatSyncLabUserError(new Error('WebSocket error'), {
      dev: true,
      hasRelayUrl: false,
    });
    expect(a).toMatch(/connect|relay/i);
    expect(a).toContain('relay:dev');
  });

  it('asks for VITE_RELAY_WS when production build without url', () => {
    const a = formatSyncLabUserError(new Error('WebSocket error'), {
      dev: false,
      hasRelayUrl: false,
    });
    expect(a).toMatch(/VITE_RELAY_WS/i);
  });

  it('does not demand env when relay url is set', () => {
    const a = formatSyncLabUserError(new Error('WebSocket error'), {
      dev: false,
      hasRelayUrl: true,
    });
    expect(a).not.toMatch(/VITE_RELAY_WS/);
    expect(a).toContain('relay:dev');
  });

  it('explains pong timeout', () => {
    const a = formatSyncLabUserError(new Error('pong timeout'), {
      dev: true,
      hasRelayUrl: true,
    });
    expect(a).toMatch(/answer|ping|timeout/i);
  });
});
