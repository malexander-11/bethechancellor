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
interface Pm {
  priorities: { id: string; title: string }[];
}
interface FinetuneItem {
  code: string;
  name?: string;
  label?: string;
  policies: { title: string; sizes: number[] }[];
}
interface FinetuneDecision {
  title: string;
  items: FinetuneItem[];
  alternatives?: { codes: string[] }[];
}
interface FinetuneSide {
  title: string;
  groups: { decisions: FinetuneDecision[] }[];
}

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../data/journey/${file}`, import.meta.url), 'utf8')) as T;

const guide = read<Guide>('guide.json');
const pm = read<Pm>('pm.json');
const finetune = read<{ tax: FinetuneSide; spending: FinetuneSide }>('finetune.json');

function stageTitle(step: string): string {
  const stage = guide.stages.find((s) => s.step === step);
  if (!stage) throw new Error(`guide.json has no stage "${step}"`);
  return stage.title;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The priorities the walk ticks: the first two the Prime Minister offers. */
const PRIORITIES = pm.priorities.slice(0, 2);

export interface Screen {
  name: string;
  /** Its heading as the data gives it; a flagship screen puts the priority's rank in front. */
  heading?: string;
  /** What the player does before pressing the primary button. */
  act?: (page: Page) => Promise<void>;
}

export const JOURNEY: readonly Screen[] = [
  { name: 'cover' },
  { name: 'briefing', heading: stageTitle('outlook') },
  {
    name: 'priorities',
    heading: stageTitle('pm'),
    act: async (page) => {
      for (const p of PRIORITIES) await page.getByRole('checkbox', { name: p.title }).check();
    },
  },
  ...PRIORITIES.map((p, i) => ({ name: `flagship ${i + 1}`, heading: p.title })),
  { name: 'fine-tune tax', heading: finetune.tax.title },
  { name: 'fine-tune spending', heading: finetune.spending.title },
  { name: 'review', heading: stageTitle('review') },
  { name: 'Budget day', heading: stageTitle('budget-day') },
];

/** The way on: every screen has at most one primary button. */
export const primary = (page: Page) => page.locator('.btn--primary');

/**
 * From the cover by the primary buttons to the screen called `until`, or to the end, checking each
 * screen's heading on arrival and handing it to `visit` before moving on.
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

/** A flagship screen's line that switches between the shortlist and every way (step 3). */
export const modeSwitch = (page: Page) => page.locator('.mode-line').getByRole('button');

/** Step 4's decisions: each a heading whose button opens it. */
export const decisions = (page: Page) =>
  page.getByRole('main').getByRole('heading').locator('button[aria-expanded]');

/** A decision's button, by its title alone, since the button also says where it stands. */
export const decisionButton = (page: Page, title: string) =>
  decisions(page).filter({ has: page.getByText(title, { exact: true }) });

/** The panel a decision's button opens. */
export async function panelOf(page: Page, title: string) {
  const id = await decisionButton(page, title).getAttribute('aria-controls');
  if (!id) throw new Error(`The decision "${title}" controls no panel`);
  return page.locator(`[id="${id}"]`);
}

/** What a row is called inside its decision: its short name, else its own (as the engine does). */
export const rowName = (item: FinetuneItem) =>
  item.label ?? item.name ?? item.policies[0]?.title ?? item.code;

/** A tick: a lever with one policy of one size, and not in a set the card draws as radios. */
const isTick = (item: FinetuneItem, decision: FinetuneDecision) =>
  item.policies.length === 1 &&
  item.policies[0]?.sizes.length === 1 &&
  !decision.alternatives?.some((set) => set.codes.includes(item.code));

/** A scale: a lever with more than one size, the plan among them. */
const isScale = (item: FinetuneItem) => item.policies.flatMap((p) => p.sizes).length > 1;

/** The first tax decision holding both a tick and a scale, with one of each. */
export const TAX_DECISION = (() => {
  for (const decision of finetune.tax.groups.flatMap((g) => g.decisions)) {
    const tick = decision.items.find((item) => isTick(item, decision));
    const scale = decision.items.find(isScale);
    if (tick && scale) return { title: decision.title, tick, scale };
  }
  throw new Error('finetune.json has no tax decision with both a tick and a scale');
})();

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
