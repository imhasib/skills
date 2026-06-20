import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Integration tests — real DB via Testcontainers (local) or GH Actions services (CI). */
export default defineConfig({
  test: {
    include: ['src/**/__integration__/**/*.int.test.ts'],
    globalSetup: ['src/__integration__/helpers/global-setup.ts'],
    setupFiles: ['src/__integration__/helpers/setup.ts'],
    testTimeout: 30_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
