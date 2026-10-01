import type { ShippedDataset } from '@btc/engine';
import { createApp } from './app.js';
import { json, type Handler } from './http.js';
import { SERVER_PATHS } from './paths.js';

/** What the server is built from: the data the game ships, made with the site. */
export interface ServerDeps {
  data: ShippedDataset;
}

/**
 * The server: everything beside the static site, as one handler. Health says it is up and which
 * data it serves, so a deployment can be checked from outside.
 */
export function createServer({ data }: ServerDeps): Handler {
  return createApp([
    {
      method: 'GET',
      path: SERVER_PATHS.health,
      handle: async () => json({ ok: true, data: data.vintage.permalinkCode, db: 'none' }),
    },
  ]);
}
