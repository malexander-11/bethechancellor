import type { Page } from '@playwright/test';
import { SHARE_TEXT } from '../apps/web/src/share/words';
import { expectAccessible } from './audit';
import { expect, test, walk } from './journey';

// The link is copied to the clipboard and read back from it, as a player pastes it; the audit asks
// for reduced motion, as every audit does.
test.use({
  permissions: ['clipboard-read', 'clipboard-write'],
  contextOptions: { reducedMotion: 'reduce' },
});

/** Budget day's link to the shared page, copied as a player copies it. */
async function copiedLink(page: Page): Promise<string> {
  await page.getByRole('button', { name: SHARE_TEXT.copy }).click();
  await expect(page.getByRole('status').filter({ hasText: SHARE_TEXT.copied })).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

/** A picture on the page, drawn by the server at the size every network previews. */
async function expectDrawn(page: Page, selector: string) {
  const picture = page.locator(selector);
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBe(1200);
}

test('a Budget shared from Budget day opens as an invitation to play', async ({ page }) => {
  await walk(page, { until: 'Budget day' });
  await expectDrawn(page, 'main img.share__picture');
  const link = await copiedLink(page);
  expect(new URL(link).pathname).toBe('/shared');

  // What a network reads: the site's page, previewing this Budget's picture and words.
  const html = await (await page.request.get(link)).text();
  const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? '';
  expect(image.replace(/&amp;/g, '&')).toMatch(/\/api\/card\?.*g=st\.5/);
  expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image" \/>/);
  expect((await page.request.get(image.replace(/&amp;/g, '&'))).headers()['content-type']).toBe(
    'image/png',
  );

  // What a reader sees: the Budget, then the way to make their own.
  await page.goto(link);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expectDrawn(page, 'main img.share__picture');
  await page.getByRole('link', { name: SHARE_TEXT.play }).click();
  await expect(page).toHaveURL(/\/outlook\?/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Or the Budget itself, opened in the game where it ended.
  await page.goto(link);
  await page.getByRole('link', { name: SHARE_TEXT.open }).click();
  await expect(page).toHaveURL(/\/budget-day\?.*g=st\.5/);
  await expectDrawn(page, 'main img.share__picture');
});

test('the shared page', async ({ page }) => {
  await walk(page, { until: 'Budget day' });
  await page.goto(await copiedLink(page));
  await expectDrawn(page, 'main img.share__picture');
  await expectAccessible(page);
});
