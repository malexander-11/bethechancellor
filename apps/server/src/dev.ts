/**
 * The server for `npm run dev` and the preview the end-to-end suite runs on: the same handlers the
 * Vercel functions run, on the data made from data/ and the renderer's files where npm put them.
 * The Vite plugin (apps/web/build/serverPlugin.ts) loads it, and hands it the site's page as the
 * dev server or the preview serves it.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { shippedDataset } from '@btc/pipeline/shipped';
import { cardAssetFiles, readCardAssets } from './card/assets.js';
import { createRenderer } from './card/render.js';
import { serveNode } from './node.js';
import type { PageHtml } from './pages.js';
import { SERVER_PATHS } from './paths.js';
import { createServer } from './server.js';

export interface DevServer {
  /** Whether a path is the server's rather than the single-page app's. */
  answers: (path: string) => boolean;
  handle: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

export function devServer({ html }: { html: PageHtml }): DevServer {
  const files = cardAssetFiles();
  const server = createServer({
    data: shippedDataset(),
    render: createRenderer(readCardAssets((file) => files[file])),
    html,
  });
  return {
    answers: (path) => Object.values(SERVER_PATHS).some((p) => p.test(path)),
    handle: (req, res) => serveNode(server, req, res),
  };
}
