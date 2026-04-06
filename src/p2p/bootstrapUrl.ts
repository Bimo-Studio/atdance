/**
 * Parse `VITE_P2P_BOOTSTRAP` per PRD F4: JSON array or comma-separated `ws://` / `wss://` URLs.
 */
import { z } from 'zod';

const wsUrl = z.string().refine(
  (u) => {
    try {
      const p = new URL(u);
      return p.protocol === 'wss:' || p.protocol === 'ws:';
    } catch {
      return false;
    }
  },
  { message: 'Each entry must be a valid ws: or wss: URL' },
);

export type ParseP2PBootstrapErrorCode = 'MISSING' | 'INVALID';

export type ParseP2PBootstrapResult =
  | { ok: true; urls: string[] }
  | { ok: false; code: ParseP2PBootstrapErrorCode; message: string };

export function parseViteP2PBootstrap(raw: string | undefined): ParseP2PBootstrapResult {
  if (raw === undefined || raw.trim() === '') {
    return {
      ok: false,
      code: 'MISSING',
      message: 'VITE_P2P_BOOTSTRAP is not set or empty.',
    };
  }

  const t = raw.trim();

  if (t.startsWith('{')) {
    return {
      ok: false,
      code: 'INVALID',
      message: 'VITE_P2P_BOOTSTRAP JSON must be an array of WebSocket URLs, not an object.',
    };
  }

  if (t.startsWith('[')) {
    try {
      const j = JSON.parse(t) as unknown;
      if (!Array.isArray(j)) {
        return {
          ok: false,
          code: 'INVALID',
          message: 'VITE_P2P_BOOTSTRAP JSON must be an array of WebSocket URLs.',
        };
      }
      const parsed = z.array(wsUrl).safeParse(j);
      if (!parsed.success) {
        return {
          ok: false,
          code: 'INVALID',
          message: parsed.error.issues.map((i) => i.message).join('; '),
        };
      }
      return { ok: true, urls: parsed.data };
    } catch {
      return {
        ok: false,
        code: 'INVALID',
        message: 'VITE_P2P_BOOTSTRAP is not valid JSON.',
      };
    }
  }

  const parts = t
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const parsed = z.array(wsUrl).safeParse(parts);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'INVALID',
      message: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }
  return { ok: true, urls: parsed.data };
}
