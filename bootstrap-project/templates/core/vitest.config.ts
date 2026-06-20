import { defineConfig } from 'vitest/config';
import path from 'node:path';

/** Unit test config. Integration tests use a separate config — see vitest.integration.config.ts. */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/__integration__/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        '**/__integration__/**',
        '**/*.test.ts',
        '**/types/**',
        'src/index.ts',
        'src/app.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
