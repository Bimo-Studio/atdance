import { expect, test } from '@playwright/test';

/**
 * Plan Phase 5.1 — load site, `?e2e=1` skips title, minimal fixture avoids long audio fetch.
 */
test.describe('smoke', () => {
  test('song select and minimal play start', async ({ page }) => {
    await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await page.keyboard.press('Digit1');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'play-ready', {
      timeout: 15_000,
    });
    await page.locator('#game-root canvas').click();
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'play-started', {
      timeout: 15_000,
    });
  });
});
