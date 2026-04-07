import { expect, test } from '@playwright/test';

/**
 * P3.6 — BDD: forced high RTT rejects first probe round; second round accepts (e2e hook).
 */
test.describe('PvP probe re-queue', () => {
  test('high RTT then recover to lobby (e2e)', async ({ page }) => {
    await page.goto('/?e2e=1&e2e_pvp_high_rtt=1', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await page.keyboard.press('KeyR');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await page.keyboard.press('KeyP');

    await expect(page.locator('#e2e-pvp-probe')).toHaveAttribute('data-result', 'reject', {
      timeout: 15_000,
    });
    await expect(page.locator('#e2e-pvp-probe')).toHaveAttribute('data-requeue-count', '0');

    await expect(page.locator('#e2e-pvp-probe')).toHaveAttribute('data-result', 'accept', {
      timeout: 15_000,
    });

    await expect(page.locator('#e2e-pvp-lobby')).toHaveAttribute('data-phase', 'lobby', {
      timeout: 15_000,
    });
  });
});
