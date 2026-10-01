import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  FINAL_STAGE,
  GAME_SETTINGS,
  PICTURE_ROWS,
  SHARE_WORDS,
  budgetTheme,
  encodePermalink,
  finetuneNames,
  gameImplementationYear,
  gameOutcomeOf,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
  type ChangeRow,
} from '@btc/engine';
import { shippedDataset } from '@btc/pipeline/shipped';
import { describe, expect, it } from 'vitest';
import { cardAssetFiles, readCardAssets } from '../src/card/assets.js';
import {
  CARD_COLOURS,
  CARD_HEIGHT,
  CARD_WIDTH,
  cardLayout,
  type CardElement,
} from '../src/card/layout.js';
import { pngSize } from '../src/card/png.js';
import { createDrawing, createRenderer } from '../src/card/render.js';
import { createServer } from '../src/server.js';

const data = shippedDataset();
const files = cardAssetFiles();
const assets = readCardAssets((file) => files[file]);
const draw = createDrawing(assets);
const outcomeOf = gameOutcomeOf(data);

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

function summaryOf(values: Record<string, number>, priorities: readonly string[] = []) {
  const budget = readFinishedBudget(data, link(values, priorities));
  if (!budget) throw new Error('not a finished Budget');
  return summariseBudget(data, budget, outcomeOf);
}

/** Every run of words in a picture, in order. */
function wordsIn(element: CardElement | string): string[] {
  if (typeof element === 'string') return [element];
  const { children } = element.props;
  if (children === undefined) return [];
  return (Array.isArray(children) ? children : [children]).flatMap(wordsIn);
}

/** A pixel's colour as #rrggbb. */
function colourAt(drawn: { pixels: Uint8Array; width: number }, x: number, y: number): string {
  const i = (y * drawn.width + x) * 4;
  return `#${[0, 1, 2].map((c) => (drawn.pixels[i + c] ?? 0).toString(16).padStart(2, '0')).join('')}`;
}

const WALK = { dip47: 1, dhsc: -0.5, itbr: 1, moj: 10, nicer: 2 };

describe('the shared picture', () => {
  it('draws a finished Budget at the size every network previews, in the site’s colours', async () => {
    const drawn = await draw(cardLayout(summaryOf(WALK, ['defence']), 'example.test'));
    expect(pngSize(drawn.png)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    expect(colourAt(drawn, 2, 2)).toBe(CARD_COLOURS.page);
    // The band along the foot is the Commons green.
    expect(colourAt(drawn, 2, CARD_HEIGHT - 2)).toBe(CARD_COLOURS.accent);
    // Words are drawn: the theme's band is far from blank.
    let marked = 0;
    for (let x = 56; x < 1100; x += 2) {
      for (let y = 30; y < 80; y += 2) if (colourAt(drawn, x, y) !== CARD_COLOURS.page) marked += 1;
    }
    expect(marked).toBeGreaterThan(500);
  });

  it('draws the game’s own picture for a link that is not a finished Budget', async () => {
    const card = cardLayout(null, 'example.test');
    expect(wordsIn(card)).toEqual(
      expect.arrayContaining([SHARE_WORDS.game, SHARE_WORDS.pitch, 'Make yours at example.test']),
    );
    expect(pngSize((await draw(card)).png)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
  });

  it('says the theme, three changes a side or two and how many more, the rules and the ratings', () => {
    const summary = summaryOf(
      { cdel: 20, def5: 1, dfe: 5, dhsc: 3, itbr: -2, moj: 10, vatfood: 1, wealth: 1 },
      ['cost-of-living', 'homes-growth', 'welfare-bill'],
    );
    const said = wordsIn(cardLayout(summary, 'example.test'));
    expect(said).toContain(summaryWords(summary).title);
    const side = (rows: readonly ChangeRow[]) => {
      const shown = rows.filter((r) => said.includes(r.name));
      expect(shown.length).toBe(rows.length <= PICTURE_ROWS ? rows.length : PICTURE_ROWS - 1);
      if (rows.length > PICTURE_ROWS) {
        expect(said).toContain(SHARE_WORDS.more.replace('{n}', String(rows.length - shown.length)));
      }
    };
    side(summary.tax);
    side(summary.spending);
    expect(said).toContain(summary.headroomLine);
    expect(said).toContain(summaryWords(summary).rules);
    for (const r of summary.ratings)
      expect(said).toEqual(expect.arrayContaining([r.title, r.label]));
  });

  it('says so when a side moved nothing', () => {
    const said = wordsIn(cardLayout(summaryOf({}), 'example.test'));
    expect(said).toEqual(expect.arrayContaining([SHARE_WORDS.noTax, SHARE_WORDS.noSpending]));
  });

  it('has a glyph for every character it can draw, in both typefaces', () => {
    const range = (css: string) =>
      [...css.matchAll(/unicode-range:\s*([^;]+);/g)]
        .map((m) => m[1] ?? '')
        .find((r) => r.includes('U+0000-00FF')) ?? '';
    const require = createRequire(import.meta.url);
    const latin = (pkg: string, css: string) =>
      range(readFileSync(path.join(path.dirname(require.resolve(pkg)), css), 'utf8'))
        .split(',')
        .map((part) => part.trim().replace('U+', '').split('-'))
        .map(([from = '0', to]) => [parseInt(from, 16), parseInt(to ?? from, 16)] as const);
    const covered = (ranges: readonly (readonly [number, number])[], text: string) =>
      [...text].filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        return !ranges.some(([from, to]) => code >= from && code <= to);
      });
    const serif = latin('@fontsource/source-serif-4', '400.css');
    const fraunces = latin('@fontsource/fraunces', '600.css');
    const names = finetuneNames(data.finetune);
    const body = [
      ...Object.values(SHARE_WORDS),
      ...data.levers.flatMap((l) => [l.shortTitle, names.get(l.code) ?? '']),
      ...data.reception.audiences.flatMap((a) => [a.title, ...a.labels]),
      '£−0123456789.,·% ',
      summaryOf(WALK, ['defence']).headroomLine,
      summaryWords(summaryOf(WALK)).rules,
    ].join('');
    const themes = data.pm.priorities.map((p) => budgetTheme(data.pm, [p.id]) ?? '').join('');
    expect(covered(serif, body)).toEqual([]);
    expect(covered(fraunces, themes + SHARE_WORDS.game + SHARE_WORDS.untitled)).toEqual([]);
  });

  it('uses only the site’s own colours', () => {
    const tokens = readFileSync(
      new URL('../../web/src/styles/tokens.css', import.meta.url),
      'utf8',
    ).toLowerCase();
    for (const [name, colour] of Object.entries(CARD_COLOURS)) {
      expect(tokens, name).toContain(colour);
    }
  });
});

describe('/api/card', () => {
  const server = createServer({ data, render: createRenderer(assets) });
  const ask = (query: string) =>
    server(new Request(`http://example.test/api/card${query}`), { ip: '' });

  it('answers a PNG the networks and the CDN may keep', async () => {
    const card = await ask(`?${link(WALK, ['defence'])}`);
    expect(card.status).toBe(200);
    expect(card.headers.get('content-type')).toBe('image/png');
    expect(card.headers.get('cache-control')).toMatch(/public.*s-maxage=\d+/);
    expect(card.headers.get('content-disposition')).toBeNull();
    expect(pngSize(new Uint8Array(await card.arrayBuffer()))).toEqual({
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  });

  it('is saved, not shown, when asked to download', async () => {
    const card = await ask(`?${link(WALK)}&download=1`);
    expect(card.headers.get('content-disposition')).toMatch(/^attachment; filename=".+\.png"$/);
  });

  it('draws the game’s own picture for anything that is not a finished Budget', async () => {
    for (const query of ['', '?v=1&L=itbr.1', '?nonsense=%E2%80%A6']) {
      const card = await ask(query);
      expect(card.status).toBe(200);
      expect(pngSize(new Uint8Array(await card.arrayBuffer()))?.width).toBe(CARD_WIDTH);
    }
  });
});
