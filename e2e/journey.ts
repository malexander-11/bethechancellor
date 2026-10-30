import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * What the suite shares: the journey's screens, named as the data names them, the walk through
 * them by the primary buttons, and the page's console errors, which fail any test they occur in.
 * Screens are found by role and accessible name, with names from data/journey/*.json, so a change
 * of copy in the app changes nothing here.
 */

interface Guide {
  stages: { step: string; title: string }[];
}
interface Budget {
  themes: { id: string; title: string; cards: { lever: string; title: string }[] }[];
}

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../data/journey/${file}`, import.meta.url), 'utf8')) as T;

const guide = read<Guide>('guide.json');
/** The walk's themes and cards, as the Budget file gives them (ADR-0046). */
export const budget = read<Budget>('budget2026.json');

function stageTitle(step: string): string {
  const stage = guide.stages.find((s) => s.step === step);
  if (!stage) throw new Error(`guide.json has no stage "${step}"`);
  return stage.title;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Screen {
  name: string;
  /** Its heading as the data gives it. */
  heading?: string;
  /** What the player does before pressing the primary button. */
  act?: (page: Page) => Promise<void>;
}

/**
 * The road (ADR-0046): the walk through the measures a theme a page, which the site opens on
 * (ADR-0047), then the small print, the balance, the review and Budget day. Agreeing with
 * everything balances, so the primary buttons alone reach the end.
 */
export const JOURNEY: readonly Screen[] = [
  ...budget.themes.map((t) => ({ name: t.title, heading: t.title })),
  { name: 'the small print' },
  { name: 'balance', heading: stageTitle('balance') },
  { name: 'review', heading: stageTitle('review') },
  { name: 'Budget day', heading: stageTitle('budget-day') },
];

/** The way on: every screen has at most one primary button. */
export const primary = (page: Page) => page.locator('.btn--primary');

/**
 * From the Budget by the primary buttons to the screen called `until`, or to the end, checking
 * each screen's heading on arrival and handing it to `visit` before moving on.
 */
export async function walk(
  page: Page,
  { until, visit }: { until?: string; visit?: (screen: Screen) => Promise<void> } = {},
) {
  const last =
    until === undefined ? JOURNEY.length - 1 : JOURNEY.findIndex((s) => s.name === until);
  if (last < 0) throw new Error(`No screen called "${until}" on the journey`);
  await page.goto('/');
  for (const [i, screen] of JOURNEY.entries()) {
    const h1 = page.getByRole('heading', { level: 1 });
    if (screen.heading) await expect(h1).toHaveText(new RegExp(`${escapeRegExp(screen.heading)}$`));
    else await expect(h1).toBeVisible();
    await visit?.(screen);
    if (i === last) return;
    await screen.act?.(page);
    await primary(page).click();
  }
}

/** A card on the walk, found by its heading. */
export const cardOf = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2, name: title }) });

/** The Budget's lever settings, as the link carries them. */
export const leversInLink = (page: Page) => new URL(page.url()).searchParams.get('L') ?? '';

/** Every test fails on a console error or an uncaught exception in the page. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
