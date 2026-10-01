/**
 * The app function's entry (api/app.js re-exports the bundle `npm run build` makes from it). Its
 * data and the site's page sit beside the bundle, written by the same build.
 */
import { readFileSync } from 'node:fs';
import type { ShippedDataset } from '@btc/engine';
import { createServer } from '../src/server.js';
import { vercelFunction } from '../src/vercel.js';

const beside = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');

export default vercelFunction(() => {
  const page = beside('index.html');
  return createServer({
    data: JSON.parse(beside('dataset.json')) as ShippedDataset,
    html: async () => page,
  });
});
