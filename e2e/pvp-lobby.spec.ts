import { expect, test } from '@playwright/test';

/**
 * P2.5 — BDD: lobby ready → countdown → stub play; both panels visible via layout hook.
 */
test.describe('PvP lobby stub', () => {
  test('ready, countdown, and play phases (e2e)', async ({ page }) => {
    await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await page.locator('#game-root canvas').click();
    await page.keyboard.press('KeyR');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await page.keyboard.press('KeyP');
    await expect(page.locator('#e2e-pvp-lobby')).toHaveAttribute('data-phase', 'lobby', {
      timeout: 10_000,
    });

    await page.locator('#game-root canvas').click();
    await page.keyboard.press('Space');
    await expect(page.locator('#e2e-pvp-lobby')).toHaveAttribute('data-phase', 'countdown', {
      timeout: 10_000,
    });

    await expect(page.locator('#e2e-pvp-lobby')).toHaveAttribute('data-phase', 'play', {
      timeout: 15_000,
    });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'play-ready', {
      timeout: 20_000,
    });
    await expect(page.locator('#e2e-pvp-play')).toHaveAttribute('data-layout', 'solo', {
      timeout: 5_000,
    });
    await expect(page.locator('#game-root canvas')).toBeVisible();
  });
});
