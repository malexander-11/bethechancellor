/**
 * The card function's entry (api/card.js re-exports the bundle): the shared picture. Its data, the
 * renderer's WebAssembly and the typefaces sit beside the bundle, copied there by the build.
 */
import { readFileSync } from 'node:fs';
import type { ShippedDataset } from '@btc/engine';
import { readCardAssets } from '../src/card/assets.js';
import { createRenderer } from '../src/card/render.js';
import { createServer } from '../src/server.js';
import { vercelFunction } from '../src/vercel.js';

export default vercelFunction(() =>
  createServer({
    data: JSON.parse(
      readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'),
    ) as ShippedDataset,
    render: createRenderer(readCardAssets((file) => new URL(`./${file}`, import.meta.url))),
  }),
);
