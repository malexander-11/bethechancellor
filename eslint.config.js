import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'data/**',
      '.vercel/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: [
      'packages/pipeline/**/*.ts',
      'apps/server/**/*.ts',
      'api/**/*.js',
      '*.config.{js,ts}',
      'apps/web/vite.config.ts',
      'apps/web/vitest.config.ts',
      'apps/web/build/**',
      'scripts/**',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The suite runs in Node and hands functions to the page, which run in the browser.
    files: ['e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
