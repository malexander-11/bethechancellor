import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/engine', 'packages/pipeline', 'apps/web'],
    coverage: {
      provider: 'v8',
      include: ['packages/engine/src/**/*.ts'],
      thresholds: { lines: 85, functions: 85, branches: 75 },
    },
  },
});
