import type { PvpMessageV1 } from '@/pvp/pvpMessageV1';
import type { PvpRelaySession } from '@/pvp/pvpRelaySession';
import type { ProbeTransport } from '@/pvp/probeTransport';

const PROBE_TIMEOUT_MS = 5000;
const PROBE_GAP_MS = 40;

/** If this returns true, the message was consumed (probe → ack). */
export function tryRespondToPvpProbe(
  session: Pick<PvpRelaySession, 'sendPvp'>,
  msg: PvpMessageV1,
): boolean {
  if (msg.type !== 'pvp.v1.probe') {
    return false;
  }
  session.sendPvp({
    type: 'pvp.v1.probeAck',
    id: msg.id,
    t1: msg.t1,
    t2: Date.now(),
  });
  return true;
}

/**
 * After samples, keep answering peer probes until the next `setOnPvpMessage` (e.g. chart negotiator).
 */
export function setMinimalPvpProbeResponder(session: PvpRelaySession): void {
  session.setOnPvpMessage((msg) => {
    tryRespondToPvpProbe(session, msg);
  });
}

function newProbeId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `pvpp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * RTT samples = round-trip time on the initiator clock: `Date.now()` when `probeAck` arrives minus `t1` from the probe (tasks **R.1**).
 */
export class RelayProbeTransport implements ProbeTransport {
  constructor(private readonly session: PvpRelaySession) {}

  async collectRttSamples(
    remoteDid: string,
    sampleCount: number,
    signal?: AbortSignal,
  ): Promise<readonly number[]> {
    void remoteDid;
    const pending = new Map<
      string,
      { readonly resolve: (ms: number) => void; readonly reject: (e: Error) => void }
    >();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = (): void => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const handler = (msg: PvpMessageV1): void => {
      if (tryRespondToPvpProbe(this.session, msg)) {
        return;
      }
      if (msg.type === 'pvp.v1.probeAck') {
        const slot = pending.get(msg.id);
        if (slot !== undefined) {
          pending.delete(msg.id);
          clearTimer();
          slot.resolve(Math.max(0, Date.now() - msg.t1));
        }
      }
    };

    this.session.setOnPvpMessage(handler);

    const out: number[] = [];
    try {
      await new Promise((r) => setTimeout(r, 80));

      for (let i = 0; i < sampleCount; i += 1) {
        if (signal?.aborted) {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          throw err;
        }
        const id = newProbeId();
        const t1 = Date.now();

        const samplePromise = new Promise<number>((resolve, reject) => {
          pending.set(id, { resolve, reject });
          timeoutId = setTimeout(() => {
            pending.delete(id);
            reject(new Error('relay probe timeout'));
          }, PROBE_TIMEOUT_MS);
        });

        this.session.sendPvp({ type: 'pvp.v1.probe', id, t1 });

        out.push(await samplePromise);
        clearTimer();

        if (i + 1 < sampleCount) {
          await new Promise((r) => setTimeout(r, PROBE_GAP_MS));
        }
      }
      return out;
    } finally {
      clearTimer();
      pending.clear();
      setMinimalPvpProbeResponder(this.session);
    }
  }
}
