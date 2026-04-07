import { expect, test } from '@playwright/test';

/**
 * PRD P1.2 — optional E2E: Sync Lab loads in relay and P2P modes (no live WebRTC assertion).
 */
test.describe('Sync Lab smoke', () => {
  test('relay mode exposes e2e hook', async ({ page }) => {
    await page.goto('/?e2e=1&sync_lab=1', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'sync-lab-relay', {
      timeout: 15_000,
    });
  });

  test('P2P mode exposes e2e hook', async ({ page }) => {
    await page.goto('/?e2e=1&sync_lab=1&sync=p2p', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'sync-lab-p2p', {
      timeout: 15_000,
    });
  });
});
