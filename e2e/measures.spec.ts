import { budget, cardOf, expect, leversInLink, primary, test } from './journey';

/**
 * The walk and the balance (ADR-0046), as a player meets them: disagreeing with a tax rise gives
 * its money up, the walk goes on page by page, and the balance page will not let the Budget go on
 * until the money is found.
 */
test('disagreeing gives money up, the balance page finds it, and the Budget is delivered', async ({
  page,
}) => {
  // The landing page's one button starts the walk (ADR-0048).
  await page.goto('/');
  await primary(page).click();
  const theme = budget.themes.find((t) => t.cards.some((c) => c.lever === 'b6save'));
  const savings = theme?.cards.find((c) => c.lever === 'b6save');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(theme?.title ?? '');
  const card = cardOf(page, savings?.title ?? '');
  await card.getByRole('button', { name: 'Remove' }).click();
  await expect(card.getByRole('button', { name: 'Remove' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => leversInLink(page)).toContain('b6save.1');
  await expect(page.locator('.bar__money')).toContainText('to find');

  // On through the rest of the walk: the themes after this one, the small print, then the balance.
  const pages = budget.themes.length - budget.themes.indexOf(theme ?? budget.themes[0]!) + 1;
  for (let i = 0; i < pages; i += 1) await primary(page).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Balance your Budget');
  await expect(primary(page)).toBeDisabled();

  // Half a point on employer National Insurance finds it; the way on opens.
  await page.getByRole('button', { name: /^Add ?: Employer National Insurance/ }).click();
  await expect.poll(() => leversInLink(page)).toContain('nicer.0.5');
  await expect(page.locator('.bar__money')).toContainText('to spend');
  await primary(page).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deliver your Budget');
  await primary(page).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What your Budget means');
});
