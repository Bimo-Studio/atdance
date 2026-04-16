import { isP2PBootstrapConfigured } from '@/pvp/pvpDiscovery';
import { getPvpRelayWsUrl } from '@/pvp/pvpRelayQueue';
import { isE2eMode } from '@/util/e2eFlags';

/** Injectable deps for {@link isPvpMatchmakingConfiguredFrom} (unit tests). */
export interface PvpMatchmakingEnvDeps {
  readonly relayUrl: string;
  readonly e2eMode: boolean;
  readonly vitePvpP2pProbe: string | boolean | undefined;
  readonly p2pBootstrapOk: boolean;
}

/**
 * Pure gate: competitive PvP matchmaking needs **some** configured transport (tasks **R.3**).
 *
 * - **E2E** mode always returns true (Playwright exercises lobby without relay).
 * - Otherwise: non-empty relay URL, **`VITE_PVP_P2P_PROBE=1`**, or P2P bootstrap parsed OK.
 */
export function isPvpMatchmakingConfiguredFrom(deps: PvpMatchmakingEnvDeps): boolean {
  if (deps.e2eMode) {
    return true;
  }
  if (deps.relayUrl.trim() !== '') {
    return true;
  }
  if (deps.vitePvpP2pProbe === '1' || deps.vitePvpP2pProbe === true) {
    return true;
  }
  if (deps.p2pBootstrapOk) {
    return true;
  }
  return false;
}

export function isPvpMatchmakingConfigured(): boolean {
  return isPvpMatchmakingConfiguredFrom({
    relayUrl: getPvpRelayWsUrl(),
    e2eMode: isE2eMode(),
    vitePvpP2pProbe: import.meta.env.VITE_PVP_P2P_PROBE,
    p2pBootstrapOk: isP2PBootstrapConfigured(),
  });
}
