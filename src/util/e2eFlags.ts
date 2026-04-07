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
