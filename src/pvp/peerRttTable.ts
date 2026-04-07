/**
 * Client-side RTT memory per remote DID (PRD §7). No IPs.
 */
export interface PeerRttEntry {
  readonly did: string;
  readonly bestRttMs: number;
  readonly lastSampleAt: number;
  readonly sampleCount: number;
  readonly lastJitterMs: number;
}

const MAX_PEERS = 100;
const DEFAULT_TTL_MS = 90 * 60 * 1000;

export class PeerRttTable {
  private readonly ttlMs: number;
  /** did → entry */
  private readonly map = new Map<string, PeerRttEntry>();

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Monotonic clock ms (pass `Date.now` in production; inject in tests). */
  recordSample(did: string, rttMs: number, jitterMs: number, nowMs: number): void {
    this.prune(nowMs);
    const prev = this.map.get(did);
    const best = prev === undefined ? rttMs : Math.min(prev.bestRttMs, rttMs);
    const count = prev === undefined ? 1 : prev.sampleCount + 1;
    this.map.set(did, {
      did,
      bestRttMs: best,
      lastSampleAt: nowMs,
      sampleCount: count,
      lastJitterMs: jitterMs,
    });
    this.evictWorstIfOverCap();
  }

  sortedByBestRtt(): readonly PeerRttEntry[] {
    return [...this.map.values()].sort((a, b) => a.bestRttMs - b.bestRttMs);
  }

  /** Replace table contents (e.g. after idb load). Prunes expired entries first. */
  replaceFromSnapshot(entries: readonly PeerRttEntry[], nowMs: number): void {
    this.map.clear();
    for (const e of entries) {
      if (nowMs - e.lastSampleAt <= this.ttlMs) {
        this.map.set(e.did, e);
      }
    }
    this.prune(nowMs);
    this.evictWorstIfOverCap();
  }

  snapshotEntries(): readonly PeerRttEntry[] {
    return this.sortedByBestRtt();
  }

  private prune(nowMs: number): void {
    for (const [k, v] of this.map) {
      if (nowMs - v.lastSampleAt > this.ttlMs) {
        this.map.delete(k);
      }
    }
  }

  /** Evict highest bestRtt when over MAX_PEERS. */
  private evictWorstIfOverCap(): void {
    while (this.map.size > MAX_PEERS) {
      const sorted = this.sortedByBestRtt();
      const worst = sorted[sorted.length - 1];
      if (worst === undefined) {
        break;
      }
      this.map.delete(worst.did);
    }
  }
}
