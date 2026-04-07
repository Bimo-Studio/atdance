import { expect, test } from '@playwright/test';

/**
 * P1.5 — BDD: song priority persistence + DID namespacing via `e2e_did` (see `getStorageDid`).
 */
test.describe.configure({ mode: 'serial' });

test.describe('song prefs storage', () => {
  test('priorities persist across reload for e2e synthetic DID', async ({ page }) => {
    await page.goto('/?e2e=1', { waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await page.locator('#game-root canvas').click();
    await page.keyboard.press('KeyR');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await page.keyboard.press('KeyK');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-prefs', {
      timeout: 10_000,
    });
    await page.locator('#game-root canvas').click();
    await page.keyboard.press('Digit1');
    await expect(page.locator('#e2e-priority-hud')).toContainText('Minimal fixture', {
      timeout: 5_000,
    });
    // `saveSongPriority` is async; ensure idb-keyval write completes before reload.
    await page.waitForTimeout(500);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await page.locator('#game-root canvas').click();
    await page.keyboard.press('KeyR');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await page.keyboard.press('KeyK');
    await expect(page.locator('#e2e-status')).toHaveAttribute('data-status', 'song-prefs', {
      timeout: 10_000,
    });
    await page.locator('#game-root canvas').click();
    await expect(page.locator('#e2e-priority-hud')).toContainText('Minimal fixture', {
      timeout: 10_000,
    });
  });

  test('e2e_did isolates priority storage', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const p1 = await ctx1.newPage();
    await p1.goto('/?e2e=1&e2e_did=a', { waitUntil: 'networkidle' });
    await expect(p1.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await p1.locator('#game-root canvas').click();
    await p1.keyboard.press('KeyR');
    await expect(p1.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await p1.keyboard.press('KeyK');
    await expect(p1.locator('#e2e-status')).toHaveAttribute('data-status', 'song-prefs', {
      timeout: 10_000,
    });
    await p1.locator('#game-root canvas').click();
    await p1.keyboard.press('Digit1');
    await expect(p1.locator('#e2e-priority-hud')).toContainText('Minimal fixture', {
      timeout: 5_000,
    });
    await ctx1.close();

    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await p2.goto('/?e2e=1&e2e_did=b', { waitUntil: 'networkidle' });
    await expect(p2.locator('#e2e-status')).toHaveAttribute('data-status', 'song-select', {
      timeout: 15_000,
    });
    await p2.locator('#game-root canvas').click();
    await p2.keyboard.press('KeyR');
    await expect(p2.locator('#e2e-status')).toHaveAttribute('data-status', 'title', {
      timeout: 10_000,
    });
    await p2.keyboard.press('KeyK');
    await expect(p2.locator('#e2e-status')).toHaveAttribute('data-status', 'song-prefs', {
      timeout: 10_000,
    });
    await p2.locator('#game-root canvas').click();
    await expect(p2.locator('#e2e-priority-hud')).toHaveText('(empty)|(empty)|(empty)', {
      timeout: 15_000,
    });
    await ctx2.close();
  });
});
