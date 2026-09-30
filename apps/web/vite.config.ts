import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { datasetPlugin } from './build/datasetPlugin';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

export default defineConfig({
  plugins: [react(), datasetPlugin({ dataDir: path.resolve(repoRoot, 'data') })],
  resolve: {
    alias: { '@data': path.resolve(repoRoot, 'data') },
  },
  server: {
    fs: { allow: [repoRoot] },
  },
  build: {
    sourcemap: true,
  },
});
