import type { ShippedDataset } from '@btc/engine';
import { createApp } from './app.js';
import { boardHealth, openBoard, type Board } from './board/routes.js';
import type { RenderCard } from './card/render.js';
import { cardRoute } from './card/route.js';
import { json, type Handler } from './http.js';
import { entryRoute, sharedRoute, type PageHtml } from './pages.js';
import { SERVER_PATHS } from './paths.js';

/** What the server is built from: the data the game ships, made with the site. */
export interface ServerDeps {
  data: ShippedDataset;
  /** Draws the shared picture; the card function and the dev server have it, the app function not. */
  render?: RenderCard;
  /** The site's page, for the pages the server writes; the app function and the dev server have it. */
  html?: PageHtml;
  /** The leaderboard; the app function and the dev server have it, open or closed. */
  board?: Board;
}

/**
 * The server: everything beside the static site, as one handler. Health says it is up, which data
 * it serves, whether the leaderboard's database answers and whether the owner can moderate, so a
 * deployment can be checked from outside.
 */
export function createServer({ data, render, html, board }: ServerDeps): Handler {
  const opened = board ? openBoard(data, board) : null;
  return createApp([
    {
      method: 'GET',
      path: SERVER_PATHS.health,
      handle: async () =>
        json({
          ok: true,
          data: data.vintage.permalinkCode,
          db: await boardHealth(board),
          admin: Boolean(board?.adminToken),
        }),
    },
    ...(render ? [cardRoute(data, render)] : []),
    ...(html
      ? [sharedRoute(data, html), entryRoute(data, html, opened?.entry ?? (async () => null))]
      : []),
    ...(opened?.routes ?? []),
  ]);
}
