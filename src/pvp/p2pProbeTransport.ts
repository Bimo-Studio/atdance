import { collectRttMsBurst } from '@/p2p/p2pNtpSample';
import type { EchoDuplex } from '@/p2p/p2pEchoHandshake';
import type { ProbeTransport } from '@/pvp/probeTransport';

/**
 * RTT collection over an existing Sync Lab–style duplex (JSON-line ping/pong).
 * Use when `VITE_PVP_P2P_PROBE=1` and a socket is available (P3.5b).
 */
export class P2PProbeTransport implements ProbeTransport {
  constructor(private readonly socket: EchoDuplex | undefined) {}

  async collectRttSamples(
    _remoteDid: string,
    sampleCount: number,
    _signal?: AbortSignal,
  ): Promise<readonly number[]> {
    if (this.socket === undefined) {
      throw new Error(
        'P2PProbeTransport: no duplex socket (connect P2P before probe, or use mock transport)',
      );
    }
    return collectRttMsBurst(this.socket, sampleCount);
  }
}
