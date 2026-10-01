import {
  gameOutcomeOf,
  readFinishedBudget,
  summariseBudget,
  type ShippedDataset,
} from '@btc/engine';
import type { Route } from '../app.js';
import { SERVER_PATHS } from '../paths.js';
import { cardLayout } from './layout.js';
import type { RenderCard } from './render.js';

/**
 * A picture depends only on its link and the data the deployment ships, so the networks and the
 * CDN may keep it: a day in a browser, a year at the edge, where each deployment starts afresh.
 */
export const CARD_CACHE = 'public, max-age=86400, s-maxage=31536000';

/**
 * GET /api/card?<a Budget's link>: the Budget drawn as a picture, every figure worked out again
 * from the link (ADR-0044). A link that is not a finished Budget gets the game's own picture.
 * With `download=1` the browser saves it rather than showing it.
 */
export function cardRoute(data: ShippedDataset, render: RenderCard): Route {
  const outcomeOf = gameOutcomeOf(data);
  return {
    method: 'GET',
    path: SERVER_PATHS.card,
    handle: async (request) => {
      const url = new URL(request.url);
      const budget = readFinishedBudget(data, url.search);
      const summary = budget ? summariseBudget(data, budget, outcomeOf) : null;
      const png = await render(cardLayout(summary, url.host));
      return new Response(Buffer.from(png), {
        headers: {
          'content-type': 'image/png',
          'cache-control': CARD_CACHE,
          ...(url.searchParams.get('download') === '1'
            ? { 'content-disposition': 'attachment; filename="my-budget.png"' }
            : {}),
        },
      });
    },
  };
}
