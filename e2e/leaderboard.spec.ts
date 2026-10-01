import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import { BOARD_TEXT, TITLE_REFUSED, countsWords } from '../apps/web/src/board/words';
import { expectAccessible } from './audit';
import { expect, test, walk } from './journey';

// Every audit asks for reduced motion.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

interface Entry {
  id: string;
  title: string;
  ups: number;
  downs: number;
}

/**
 * A Budget on the leaderboard, put there through its server as Budget day's form does. Each test
 * in each project posts a Budget of its own (`variant`), so none votes on another's entry.
 */
async function posted(
  request: APIRequestContext,
  info: TestInfo,
  title: string,
  variant: number,
): Promise<Entry> {
  const size = info.project.name === 'phone' ? 5 : 10;
  const query = `v=1&g=st.5_pr.safer-streets&L=moj.${size}_dhsc.${variant}`;
  const answer = await request.post('/api/budgets', { data: { query, title } });
  expect([200, 201], await answer.text()).toContain(answer.status());
  return ((await answer.json()) as { entry: Entry }).entry;
}

/** An entry's line on the leaderboard, found by its title's heading. */
const lineOf = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2, name: title }) });

test('a Budget on the leaderboard is voted on, opened and reported', async ({
  page,
  request,
}, info) => {
  const entry = await posted(request, info, `Streets first ${info.project.name}`, 1);
  await page.goto('/leaderboard?sort=new');
  const line = lineOf(page, entry.title);
  await expect(line).toBeVisible();

  const voteFor = line.getByRole('button', { name: new RegExp(BOARD_TEXT.voteFor) });
  await voteFor.click();
  await expect(voteFor).toHaveAttribute('aria-pressed', 'true');
  await expect(
    line.getByText(countsWords({ ups: entry.ups + 1, downs: entry.downs })),
  ).toBeVisible();

  // Its page: the title, the picture its preview shows, and the vote this browser made.
  await line.getByRole('link', { name: entry.title }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title);
  await expect(page.getByRole('button', { name: new RegExp(BOARD_TEXT.voteFor) })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const picture = page.locator('main img.share__picture');
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBe(1200);
  const html = await (await page.request.get(page.url())).text();
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/api\/card\?/);

  await page.getByRole('button', { name: new RegExp(BOARD_TEXT.report) }).click();
  await expect(page.getByRole('button', { name: new RegExp(BOARD_TEXT.reported) })).toBeDisabled();
});

test('the leaderboard', async ({ page, request }, info) => {
  const entry = await posted(request, info, `Audited ${info.project.name}`, 2);
  await page.goto('/leaderboard?sort=new');
  await expect(lineOf(page, entry.title)).toBeVisible();
  await expectAccessible(page);
});

test('a leaderboard entry', async ({ page, request }, info) => {
  const entry = await posted(request, info, `Audited entry ${info.project.name}`, 3);
  await page.goto(`/leaderboard/${entry.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.title);
  await expectAccessible(page);
});

test('a Budget posted from Budget day lands on the leaderboard under its title', async ({
  page,
  consoleErrors,
}, info) => {
  await walk(page, { until: 'Budget day' });
  const field = page.getByLabel(BOARD_TEXT.postLabel);
  const post = page.getByRole('button', { name: BOARD_TEXT.postButton });

  // A title with a web address in it is refused, and the field says so.
  await field.fill('See www.example.org');
  await post.click();
  await expect(page.getByText(TITLE_REFUSED.link ?? '')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toBeFocused();
  // The browser logs the refusal as a failed load; here the refusal is what is being tested.
  const refused = consoleErrors.findIndex((error) => error.includes('status of 422'));
  expect(refused).toBeGreaterThanOrEqual(0);
  consoleErrors.splice(refused, 1);

  // The walk's Budget is the same in both projects: whichever posts second finds it already there.
  await field.fill(`The walk's Budget, ${info.project.name}`);
  await post.click();
  await expect(
    page.getByRole('status').filter({ hasText: /is (already )?on the leaderboard/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: BOARD_TEXT.seeEntry }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^The walk's Budget, /);
});
