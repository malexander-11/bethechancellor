import {
  SHARE_WORDS,
  gameOutcomeOf,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
  type ShippedDataset,
} from '@btc/engine';
import type { Route } from './app.js';
import { CARD_HEIGHT, CARD_WIDTH } from './card/layout.js';
import { SERVER_PATHS } from './paths.js';

/** Where the site's index.html holds the tags a page of the server's replaces. */
export const META_START = '<!-- btc:meta -->';
export const META_END = '<!-- /btc:meta -->';

/**
 * A page depends only on its link, the data and the site's build, all fixed for a deployment, so
 * the edge keeps it for a day and every deployment starts afresh. Browsers ask each time.
 */
export const PAGE_CACHE = 'public, max-age=0, s-maxage=86400';

/** The site's index.html, as the deployment ships it, for the request it answers. */
export type PageHtml = (url: URL) => Promise<string>;

/**
 * A leaderboard entry's page carries a player's title, which the owner may take down, so the edge
 * keeps it only briefly.
 */
export const ENTRY_PAGE_CACHE = 'public, max-age=0, s-maxage=60';

/** What a link's preview says of the page it opens. */
export interface PageMeta {
  /** The browser tab and the preview's heading. */
  title: string;
  description: string;
  /** The page's own address, every link to the same Budget written the same way. */
  url: string;
  image: string;
  imageAlt: string;
  /** Kept out of search engines: a page of a player's words. */
  noindex?: boolean;
}

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text as it may stand inside an element or an attribute. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** The tags the networks read a link's preview from: Open Graph's, and X's card on top. */
export function metaTags(meta: PageMeta): string {
  const tag = (attribute: 'name' | 'property', key: string, value: string) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    tag('name', 'description', meta.description),
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    tag('property', 'og:type', 'website'),
    tag('property', 'og:site_name', SHARE_WORDS.game),
    tag('property', 'og:title', meta.title),
    tag('property', 'og:description', meta.description),
    tag('property', 'og:url', meta.url),
    tag('property', 'og:image', meta.image),
    tag('property', 'og:image:width', String(CARD_WIDTH)),
    tag('property', 'og:image:height', String(CARD_HEIGHT)),
    tag('property', 'og:image:alt', meta.imageAlt),
    tag('name', 'twitter:card', 'summary_large_image'),
    tag('name', 'twitter:image:alt', meta.imageAlt),
    ...(meta.noindex ? [tag('name', 'robots', 'noindex')] : []),
  ].join('\n    ');
}

/** The page with its tags in place of the ones between the markers; as it was without them. */
export function withMeta(html: string, tags: string): string {
  const start = html.indexOf(META_START);
  const end = html.indexOf(META_END, start);
  if (start < 0 || end < 0) return html;
  return `${html.slice(0, start + META_START.length)}\n    ${tags}\n    ${html.slice(end)}`;
}

/** The game's own preview: for a link that is not a finished Budget. */
export function siteMeta(origin: string): PageMeta {
  return {
    title: SHARE_WORDS.game,
    description: SHARE_WORDS.pitch,
    url: `${origin}/`,
    image: `${origin}/api/card`,
    imageAlt: `${SHARE_WORDS.game} ${SHARE_WORDS.pitch}`,
  };
}

/** A Budget's preview, read again from its link: its name and words, and its picture. */
function budgetMeta(
  data: ShippedDataset,
  outcomeOf: ReturnType<typeof gameOutcomeOf>,
  origin: string,
  query: string,
): (Omit<PageMeta, 'url' | 'title'> & { name: string; query: string }) | null {
  const budget = readFinishedBudget(data, query);
  if (!budget) return null;
  const words = summaryWords(summariseBudget(data, budget, outcomeOf));
  return {
    name: words.title,
    query: budget.query,
    description: words.description,
    image: `${origin}/api/card?${budget.query}`,
    imageAlt: words.alt,
  };
}

/** The page, its tags in place; the game's own when anything goes wrong in making them. */
async function page(
  html: PageHtml,
  url: URL,
  cache: string,
  metaFor: () => Promise<PageMeta>,
): Promise<Response> {
  let meta: PageMeta;
  try {
    meta = await metaFor();
  } catch (error) {
    const said = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
    console.error('page meta:', said.slice(0, 300));
    meta = siteMeta(url.origin);
  }
  return new Response(withMeta(await html(url), metaTags(meta)), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache },
  });
}

/**
 * GET /shared?<a Budget's link>: the site's page, which draws the Budget, with tags that preview it
 * as the picture and its words (ADR-0044). Every figure is worked out again from the link, which is
 * written the one way every link to it takes. Whatever goes wrong, the page is served with the
 * game's own preview: a reader is never turned away for want of one.
 */
export function sharedRoute(data: ShippedDataset, html: PageHtml): Route {
  const outcomeOf = gameOutcomeOf(data);
  return {
    method: 'GET',
    path: SERVER_PATHS.shared,
    handle: async (request) => {
      const url = new URL(request.url);
      return page(html, url, PAGE_CACHE, async () => {
        const meta = budgetMeta(data, outcomeOf, url.origin, url.search);
        if (!meta) return siteMeta(url.origin);
        const { name, query, ...rest } = meta;
        return {
          ...rest,
          title: `${name} · ${SHARE_WORDS.game}`,
          url: `${url.origin}/shared?${query}`,
        };
      });
    },
  };
}

/** A leaderboard entry as its page needs it: a player's title and the Budget's link. */
export type EntryOf = (id: string) => Promise<{ title: string; query: string } | null>;

/**
 * GET /leaderboard/<id>: an entry's page, previewing the Budget's picture under the player's title
 * (ADR-0044). It is kept out of search engines, and an entry taken down, or a leaderboard not open,
 * previews the game.
 */
export function entryRoute(data: ShippedDataset, html: PageHtml, entryOf: EntryOf): Route {
  const outcomeOf = gameOutcomeOf(data);
  return {
    method: 'GET',
    path: SERVER_PATHS.entryPage,
    handle: async (request, [id = '']) => {
      const url = new URL(request.url);
      const own = `${url.origin}/leaderboard/${id}`;
      return page(html, url, ENTRY_PAGE_CACHE, async () => {
        const entry = await entryOf(id);
        const meta = entry ? budgetMeta(data, outcomeOf, url.origin, entry.query) : null;
        if (!entry || !meta) return { ...siteMeta(url.origin), url: own, noindex: true };
        return {
          title: `${entry.title} · ${SHARE_WORDS.game}`,
          description: `${meta.name}. ${meta.description}`,
          url: own,
          image: meta.image,
          imageAlt: meta.imageAlt,
          noindex: true,
        };
      });
    },
  };
}
