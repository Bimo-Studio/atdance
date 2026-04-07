import { expect, test } from '@playwright/test';

/**
 * P0.7a — Auth gate BDD: non-e2e traffic must not reach song select without a session.
 * P0.7b — `?e2e=1` → song-select is covered by `e2e/smoke.spec.ts`.
 */
test.describe('auth gate', () => {
  test('without e2e flag, unauthenticated user sees sign-in UI and not song-select', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByPlaceholder('handle.example.com')).toBeVisible({ timeout: 20_000 });

    await expect(page.locator('#e2e-status')).not.toHaveAttribute('data-status', 'song-select', {
      timeout: 5_000,
    });
  });
});
