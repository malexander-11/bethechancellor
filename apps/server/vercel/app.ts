/**
 * The app function's entry (api/app.js re-exports the bundle `npm run build` makes from it). Its
 * data sits beside the bundle, written by the same build.
 */
import { readFileSync } from 'node:fs';
import type { ShippedDataset } from '@btc/engine';
import { createServer } from '../src/server.js';
import { vercelFunction } from '../src/vercel.js';

export default vercelFunction(() =>
  createServer({
    data: JSON.parse(
      readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'),
    ) as ShippedDataset,
  }),
);
