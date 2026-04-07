import { defineConfig, devices } from '@playwright/test';

/**
 * Preview of `pnpm build:invite` (invite-only env baked in). Run `pnpm e2e:invite` (builds first).
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: 'invite-build.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'pnpm exec vite preview --host 127.0.0.1 --port 4174 --strictPort --outDir dist-invite',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
