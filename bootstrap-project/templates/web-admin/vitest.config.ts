import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Use the automatic JSX runtime so test files (and the components they
  // render) don't need `import React` in scope. Mirrors Next.js's own
  // SWC config so source files compile the same way under vitest.
  esbuild: {
    jsx: 'automatic',
  },
});
