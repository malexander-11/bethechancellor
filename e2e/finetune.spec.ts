import {
  TAX_DECISION,
  decisionButton,
  decisions,
  expect,
  leversInLink,
  modeSwitch,
  panelOf,
  rowName,
  test,
  walk,
} from './journey';

const { title, tick, scale } = TAX_DECISION;

test('a first game meets every decision on both fine-tune screens, with no mode line', async ({
  page,
}) => {
  for (const until of ['fine-tune tax', 'fine-tune spending']) {
    await walk(page, { until });
    await expect(decisions(page).first()).toBeVisible();
    await expect(modeSwitch(page)).toHaveCount(0);
  }
});

test('the mode line on a flagship screen switches between the shortlist and every way', async ({
  page,
}) => {
  // A first game is in basic mode: step 3 shows the best ways and any that deal with the desk.
  await walk(page, { until: 'flagship 1' });
  const ways = page.getByRole('group', { name: /^Ways to deliver/ }).getByRole('checkbox');
  const shortlist = await ways.count();
  expect(shortlist, 'ways on show in basic mode').toBeGreaterThan(0);
  const line = await modeSwitch(page).innerText();

  await modeSwitch(page).click();
  await expect.poll(() => ways.count(), 'every way').toBeGreaterThan(shortlist);
  await expect(modeSwitch(page)).not.toHaveText(line);
  await expect(modeSwitch(page)).toBeFocused();

  await modeSwitch(page).click();
  await expect(ways).toHaveCount(shortlist);
  await expect(modeSwitch(page)).toHaveText(line);
});

test('a decision opens, a tick goes into the link, and Undo takes it out', async ({ page }) => {
  await walk(page, { until: 'fine-tune tax' });
  const toggle = decisionButton(page, title);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const panel = await panelOf(page, title);
  await expect(panel).toBeVisible();

  const box = panel.getByRole('checkbox', { name: rowName(tick), exact: true });
  expect(leversInLink(page)).not.toContain(tick.code);
  await box.check();
  await expect.poll(() => leversInLink(page), 'L= in the link').toContain(tick.code);

  await panel.getByRole('button', { name: /^Undo\b/ }).click();
  await expect(box).not.toBeChecked();
  await expect.poll(() => leversInLink(page), 'L= in the link').not.toContain(tick.code);
});

test('the arrow keys move along a scale', async ({ page }) => {
  await walk(page, { until: 'fine-tune tax' });
  await decisionButton(page, title).click();
  const panel = await panelOf(page, title);
  const radios = panel
    .getByRole('radiogroup', { name: rowName(scale), exact: true })
    .getByRole('radio');
  const count = await radios.count();
  expect(count, 'levels on the scale').toBeGreaterThan(1);
  const planned = await radios.evaluateAll((els) =>
    els.findIndex((el) => (el as HTMLInputElement).checked),
  );
  expect(planned, 'a level checked at rest').toBeGreaterThanOrEqual(0);
  const next = (planned + 1) % count;

  await radios.nth(planned).focus();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(next)).toBeChecked();
  await expect(radios.nth(next)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(radios.nth(planned)).toBeChecked();
});
