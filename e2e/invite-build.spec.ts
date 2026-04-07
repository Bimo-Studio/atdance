import { expect, test } from '@playwright/test';

/**
 * P5.3 — Built client with `VITE_INVITE_ONLY=1` (see `pnpm build:invite`).
 */
test.describe('invite-only production build', () => {
  test('sets data-invite-only and e2e boot reaches song-select', async ({ page }) => {
    await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-invite-only', '1');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
  });
});
