/**
 * The server for `npm run dev` and the preview the end-to-end suite runs on: the same handlers the
 * Vercel functions run, on the data made from data/ and the renderer's files where npm put them,
 * with a leaderboard in memory that the limits barely touch, since everything there is one network.
 * The Vite plugin (apps/web/build/serverPlugin.ts) loads it, and hands it the site's page as the
 * dev server or the preview serves it.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { shippedDataset } from '@btc/pipeline/shipped';
import type { Db } from './board/db.js';
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

/** Room for a test suite's worth of posts, votes and reports from one machine. */
const DEV_LIMITS = {
  postsPerHour: 1000,
  postsPerDay: 10_000,
  voteChangesPerHour: 10_000,
  newVotersPerEntryPerDay: 1000,
  reportsPerDay: 1000,
};

export function devServer({ html }: { html: PageHtml }): DevServer {
  const files = cardAssetFiles();
  let db: Promise<Db> | undefined;
  const server = createServer({
    data: shippedDataset(),
    render: createRenderer(readCardAssets((file) => files[file])),
    html,
    board: {
      // PGlite is loaded only when the leaderboard is first asked for.
      db: () => (db ??= import('./board/pglite.js').then((m) => m.pgliteDb())),
      hashKey: 'dev',
      ...(process.env.ADMIN_TOKEN ? { adminToken: process.env.ADMIN_TOKEN } : {}),
      limits: DEV_LIMITS,
    },
  });
  return {
    answers: (path) => Object.values(SERVER_PATHS).some((p) => p.test(path)),
    handle: (req, res) => serveNode(server, req, res),
  };
}
