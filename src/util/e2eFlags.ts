/**
 * E2E smoke tests append `?e2e=1` to skip non-essential screens (plan Phase 5.1).
 */
export function e2eFromSearch(search: string): boolean {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q).get('e2e') === '1';
}

/** When `e2e=1`, boot straight to Sync Lab (Playwright smoke for relay vs P2P UI). */
export function syncLabE2eFromSearch(search: string): boolean {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q).get('sync_lab') === '1';
}

export function isE2eMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return e2eFromSearch(window.location.search);
}

/** Force first probe round to fail RTT gate (`e2e/pvp-lobby` high-latency scenario). */
export function e2ePvpHighRttFromSearch(search: string): boolean {
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q).get('e2e_pvp_high_rtt') === '1';
}

export function isE2ePvpHighRtt(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return e2ePvpHighRttFromSearch(window.location.search);
}

/** DOM hook for Playwright when `?e2e=1` (Phaser text is not in the DOM). */
export function setE2eStatus(status: string): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-status');
  if (el) {
    el.setAttribute('data-status', status);
  }
}

/** Pipe-separated slot summaries for Playwright (`#e2e-priority-hud`). */
export function setE2ePriorityHud(summary: string): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-priority-hud');
  if (el) {
    el.textContent = summary;
  }
}

/** Magnet count + optional label for Playwright (`#e2e-magnet-hud`). */
export function setE2eMagnetHud(summary: string): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-magnet-hud');
  if (el) {
    el.textContent = summary;
  }
}

/** PvP lobby stub phase for Playwright (`#e2e-pvp-lobby` `data-phase`). */
export function setE2ePvpLobbyPhase(
  phase: 'matching' | 'lobby' | 'countdown' | 'play' | 'end' | 'probing',
): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-pvp-lobby');
  if (el) {
    el.setAttribute('data-phase', phase);
  }
}

/** PvP play layout when `PlayScene` uses split playfield (`#e2e-pvp-play` `data-layout`). */
export function setE2ePvpPlayLayout(layout: 'solo' | 'split'): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-pvp-play');
  if (el) {
    el.setAttribute('data-layout', layout);
  }
}

/** Last probe gate outcome for Playwright (`#e2e-pvp-probe`). */
export function setE2ePvpProbeOutcome(result: 'accept' | 'reject', requeueCount: number): void {
  if (!isE2eMode()) {
    return;
  }
  const el = document.getElementById('e2e-pvp-probe');
  if (el) {
    el.setAttribute('data-result', result);
    el.setAttribute('data-requeue-count', String(requeueCount));
  }
}
