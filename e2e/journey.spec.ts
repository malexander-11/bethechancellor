import { expect, test, walk } from './journey';

test('the journey from the cover to Budget day, by the primary buttons', async ({
  page,
  consoleErrors,
}) => {
  await walk(page, {
    visit: (screen) =>
      test.step(screen.name, async () => {
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        expect(consoleErrors, 'console errors').toEqual([]);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
        const primaries = await page.locator('.btn--primary:visible').count();
        expect(primaries, 'primary buttons').toBeLessThanOrEqual(1);
      }),
  });
});
