import { readFileSync } from 'node:fs';
import {
  FINAL_STAGE,
  GAME_SETTINGS,
  SHARE_WORDS,
  encodePermalink,
  gameImplementationYear,
  gameOutcomeOf,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { shippedDataset } from '@btc/pipeline/shipped';
import { describe, expect, it } from 'vitest';
import { CARD_HEIGHT, CARD_WIDTH } from '../src/card/layout.js';
import { META_END, META_START, escapeHtml, metaTags, withMeta } from '../src/pages.js';
import { createServer } from '../src/server.js';

const data = shippedDataset();
/** The site's page as written, markers and all: what the build copies beside the app function. */
const SITE = readFileSync(new URL('../../web/index.html', import.meta.url), 'utf8');
const server = createServer({ data, html: async () => SITE });
const ask = (path: string, method = 'GET') =>
  server(new Request(`https://example.test${path}`, { method }), { ip: '' });

/** A finished Budget's link, as the web writes one. */
function link(values: Record<string, number>, priorities: readonly string[] = []): string {
  return encodePermalink(
    {
      vintageCode: data.vintage.permalinkCode,
      rulesCode: data.rules.permalinkCode,
      implementationYear: gameImplementationYear(data.vintage),
      leverValues: values,
      ...GAME_SETTINGS,
      game: { reached: FINAL_STAGE, priorities: [...priorities] },
    },
    data.levers,
  );
}

/** The tags of a page, by name or property, as the networks read them. */
function tagsOf(html: string): Map<string, string> {
  const decode = (text: string) =>
    text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  const found = new Map<string, string>();
  for (const m of html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)" \/>/g)) {
    found.set(m[1] ?? '', decode(m[2] ?? ''));
  }
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  if (title !== undefined) found.set('title', decode(title));
  const canonical = /<link rel="canonical" href="([^"]*)" \/>/.exec(html)?.[1];
  if (canonical !== undefined) found.set('canonical', decode(canonical));
  return found;
}

const WALK = { dip47: 1, dhsc: -0.5, itbr: 1, moj: 10, nicer: 2 };

describe('a shared Budget’s page', () => {
  it('is the site’s own page, previewing the Budget as its picture and its words', async () => {
    const query = link(WALK, ['defence']);
    const page = await ask(`/shared?${query}`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(page.headers.get('cache-control')).toMatch(/public.*s-maxage=\d+/);
    const html = await page.text();
    // The page the browser runs is untouched outside the markers.
    expect(html.slice(html.indexOf(META_END))).toBe(SITE.slice(SITE.indexOf(META_END)));
    expect(html.slice(0, html.indexOf(META_START))).toBe(SITE.slice(0, SITE.indexOf(META_START)));

    const budget = readFinishedBudget(data, query);
    if (!budget) throw new Error('not a finished Budget');
    const words = summaryWords(summariseBudget(data, budget, gameOutcomeOf(data)));
    const tags = tagsOf(html);
    expect(tags.get('title')).toBe(`${words.title} · ${SHARE_WORDS.game}`);
    expect(tags.get('og:title')).toBe(tags.get('title'));
    expect(tags.get('description')).toBe(words.description);
    expect(tags.get('og:description')).toBe(words.description);
    expect(tags.get('og:image')).toBe(`https://example.test/api/card?${budget.query}`);
    expect(tags.get('og:image:width')).toBe(String(CARD_WIDTH));
    expect(tags.get('og:image:height')).toBe(String(CARD_HEIGHT));
    expect(tags.get('og:image:alt')).toBe(words.alt);
    expect(tags.get('twitter:card')).toBe('summary_large_image');
    expect(tags.get('og:url')).toBe(`https://example.test/shared?${budget.query}`);
    expect(tags.get('canonical')).toBe(tags.get('og:url'));
    // One title and one description: the site's own went with the markers' contents.
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it('writes every link to the same Budget the one way', async () => {
    // The same choices, the economy left out and a value off its lever's steps.
    const tags = tagsOf(await (await ask(`/shared?${link({ ...WALK, moj: 10.2 })}`)).text());
    const same = tagsOf(await (await ask(`/shared?${link(WALK)}`)).text());
    expect(tags.get('og:url')).toBe(same.get('og:url'));
    expect(tags.get('og:image')).toBe(same.get('og:image'));
  });

  it('previews the game itself for a link that is not a finished Budget', async () => {
    for (const query of ['', '?v=1&L=itbr.1', '?v=1&g=st.3', '?%E2%80%A6=%3Cscript%3E']) {
      const page = await ask(`/shared${query}`);
      expect(page.status).toBe(200);
      const tags = tagsOf(await page.text());
      expect(tags.get('title')).toBe(SHARE_WORDS.game);
      expect(tags.get('og:image')).toBe('https://example.test/api/card');
      expect(tags.get('og:url')).toBe('https://example.test/');
    }
  });

  it('answers a HEAD as the page without it', async () => {
    const head = await ask(`/shared?${link(WALK)}`, 'HEAD');
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});

describe('the tags', () => {
  it('escape whatever they carry, so no value can end its attribute or open an element', () => {
    const nasty = `"><script>alert('x')</script>&`;
    const tags = metaTags({
      title: nasty,
      description: nasty,
      url: nasty,
      image: nasty,
      imageAlt: nasty,
    });
    expect(tags).not.toContain('<script>');
    expect(tags).not.toMatch(/content="[^"]*"[^ /]/);
    expect(escapeHtml(nasty)).toBe(
      '&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;',
    );
  });

  it('leave a page without the markers as it was', () => {
    const plain = '<html><head><title>x</title></head></html>';
    expect(withMeta(plain, '<title>y</title>')).toBe(plain);
  });
});
