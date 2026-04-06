import { mergeConfig } from 'vite';

import { defineConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      environment: 'node',
      include: ['src/**/*.test.ts', 'relay/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.ts', 'relay/src/**/*.ts'],
        // Phaser scenes + thin entrypoints: E2E/manual later (plan Phase 5).
        exclude: [
          '**/*.test.ts',
          '**/*.d.ts',
          'src/scenes/**',
          'src/main.ts',
          'relay/src/index.ts',
          'src/types/**',
          'src/play/**',
          'src/game/types.ts',
          'src/auth/authProvider.ts',
          'src/auth/browserOAuth.ts',
          'src/auth/atprotoSession.ts',
          'src/version.ts',
        ],
        thresholds: {
          lines: 50,
          statements: 50,
        },
      },
    },
  }),
);
