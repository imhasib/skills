import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'next.config.mjs',
      'postcss.config.mjs',
      'tailwind.config.ts',
      'vitest.config.ts',
      'eslint.config.mjs',
      'next-env.d.ts',
      'commitlint.config.js',
      '.lintstagedrc.json',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
