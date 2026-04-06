/**
 * JSON line framing for P2P duplex streams (PRD §8 — JSON first).
 * Reuses `SyncMessageV1` so relay and P2P share one schema until binary channel is added.
 */
import {
  parseSyncMessageV1,
  stringifySyncMessageV1,
  type SyncMessageV1,
} from '@/sync/syncMessageV1';

export function encodeSyncWireLine(msg: SyncMessageV1): string {
  return `${stringifySyncMessageV1(msg)}\n`;
}

/**
 * Incrementally parse complete `\n`-terminated lines from a duplex; keeps incomplete tail in `buffer`.
 */
export function feedSyncWireBuffer(
  buffer: string,
  chunk: string,
): { buffer: string; messages: SyncMessageV1[] } {
  const combined = buffer + chunk;
  const lines = combined.split('\n');
  const rest = lines.pop() ?? '';
  const messages: SyncMessageV1[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const m = parseSyncMessageV1(line);
    if (m) {
      messages.push(m);
    }
  }
  return { buffer: rest, messages };
}
