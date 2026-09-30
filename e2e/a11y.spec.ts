import { expectAccessible } from './audit';
import {
  JOURNEY,
  TAX_DECISION,
  decisionButton,
  expect,
  showEveryIdea,
  test,
  walk,
} from './journey';

// Motion is a courtesy, never a requirement: with less of it asked for, nothing may be moving.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

for (const screen of JOURNEY) {
  test(screen.name, async ({ page }) => {
    await walk(page, { until: screen.name });
    await expectAccessible(page);
  });
}

test('fine-tune tax, every idea, a decision open', async ({ page }) => {
  await walk(page, { until: 'fine-tune tax' });
  await showEveryIdea(page);
  await decisionButton(page, TAX_DECISION.title).click();
  await expectAccessible(page);
});

for (const path of ['/about', '/methodology']) {
  test(path, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
}
