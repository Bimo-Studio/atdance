/**
 * Structured relay log lines (PRD §9). **Never** include IP addresses — only DIDs and opaque ids.
 */
export type RelayLogPhase = 'probe' | 'ready' | 'countdown' | 'play' | 'end' | 'queue';

export interface RelayStructuredLog {
  readonly evt: string;
  readonly traceId: string;
  readonly phase?: RelayLogPhase;
  readonly clientId?: string;
  readonly playerDid?: string;
  readonly peerClientId?: string;
  readonly roomId?: string;
  /** Same as `roomId` when logging §9 `match_probe` (stable key for agents). */
  readonly matchId?: string;
  readonly localDid?: string;
  readonly remoteDid?: string;
  readonly rttMeanMs?: number;
  readonly rttP95Ms?: number;
  readonly jitterStdMs?: number;
  readonly decision?: 'accept' | 'reject';
  readonly rejectReason?: string;
  readonly clockSyncMode?: 'shared_epoch' | 'audio_proof';
}

export function formatRelayLogLine(payload: RelayStructuredLog): string {
  const line = {
    ts: new Date().toISOString(),
    svc: 'relay' as const,
    ...payload,
  };
  return JSON.stringify(line);
}
