import { expectAccessible } from './audit';
import { JOURNEY, budget, cardOf, expect, test, walk } from './journey';

// Motion is a courtesy, never a requirement: with less of it asked for, nothing may be moving.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const screen of JOURNEY) {
  test(screen.name, async ({ page }) => {
    await walk(page, { until: screen.name });
    await expectAccessible(page);
  });
}

test('a card disagreed with', async ({ page }) => {
  const theme = budget.themes[0];
  const card = theme?.cards[0];
  await walk(page, { until: theme?.title ?? '' });
  await cardOf(page, card?.title ?? '')
    .getByRole('button', { name: 'Disagree' })
    .click();
  await expect(
    cardOf(page, card?.title ?? '').getByRole('button', { name: 'Disagree' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expectAccessible(page);
});

test('the balance page, short of money', async ({ page }) => {
  await page.goto('/balance?v=1&g=st.1_rd.3&L=b6hmrc.1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

for (const path of ['/about', '/methodology']) {
  test(path, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
}
