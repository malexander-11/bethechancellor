import { describe, expect, it } from 'vitest';
import { computeOutcome, headSeries } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const run = (leverValues: Record<string, number>, implementationYear?: string) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: implementationYear ? { leverValues, implementationYear } : { leverValues },
  });
const effectOf = (o: ReturnType<typeof run>, code: string) => {
  const e = o.leverEffects.find((x) => x.code === code);
  if (!e) throw new Error(`no effect for ${code}`);
  return e;
};
const capStatus = (o: ReturnType<typeof run>) =>
  o.verdicts.find((v) => v.kind === 'welfareCap')?.status;

describe('Budget 2025 spending decisions and the welfare cap', () => {
  it('reinstating the two-child limit saves the Treasury figure on the spending side', () => {
    const e = effectOf(run({ rv2ch: 1 }), 'rv2ch');
    expect(e.currentSpending['2026-27']).toBe(0);
    expect(e.currentSpending['2027-28']).toBeCloseTo(-2590, 6);
    expect(e.currentSpending['2029-30']).toBeCloseTo(-3095, 6);
    expect(e.currentSpending['2030-31']).toBeCloseTo(-3235, 6);
    expect(e.welfareInCap['2029-30']).toBeCloseTo(-3095, 6);
    expect(e.receipts['2029-30']).toBe(0);
    expect(e.capitalSpending['2029-30']).toBe(0);
    const early = effectOf(run({ rv2ch: 1 }, '2026-27'), 'rv2ch');
    expect(early.currentSpending['2026-27']).toBeCloseTo(-2365, 6);
  });

  it('the welfare cap verdict moves from within the margin to within the cap with two toggles', () => {
    expect(capStatus(run({}))).toBe('aboveCapWithinMargin');
    const pipOnly = run({ rvpip: 1 });
    expect(pipOnly.paths.policy.welfareInCap['2029-30']).toBeCloseTo(199200 - 4495, 6);
    expect(capStatus(pipOnly)).toBe('aboveCapWithinMargin');
    const both = run({ rvpip: 1, rv2ch: 1 });
    expect(both.paths.policy.welfareInCap['2029-30']).toBeCloseTo(199200 - 4495 - 3095, 6);
    expect(capStatus(both)).toBe('withinCap');
    const preset = ds.presets.presets.find((p) => p.id === 'reverse-welfare-u-turns');
    const all = run(preset?.leverValues ?? {});
    expect(capStatus(all)).toBe('withinCap');
    expect(all.paths.deltas.welfareInCap['2029-30']).toBeCloseTo(-4495 - 3095 - 1340, 6);
  });

  it('the winter fuel toggle follows the measure’s own profile from the start year', () => {
    const e = effectOf(run({ rvwfp: 1 }), 'rvwfp');
    expect(e.currentSpending['2025-26']).toBe(0);
    expect(e.currentSpending['2026-27']).toBe(0);
    expect(e.currentSpending['2027-28']).toBeCloseTo(-910, 6);
    expect(e.currentSpending['2029-30']).toBeCloseTo(-1340, 6);
  });

  it('dropping the efficiency savings raises day-to-day spending from 2028-29 outside the cap', () => {
    const o = run({ rveff: 1 });
    const e = effectOf(o, 'rveff');
    expect(e.currentSpending['2027-28']).toBe(0);
    expect(e.currentSpending['2028-29']).toBeCloseTo(1415, 6);
    expect(e.currentSpending['2029-30']).toBeCloseTo(3950, 6);
    expect(e.currentSpending['2030-31']).toBeCloseTo(4900, 6);
    expect(e.welfareInCap['2029-30']).toBe(0);
    expect(o.attribution.find((r) => r.code === 'rveff')?.currentBudgetGbpm).toBeCloseTo(3950, 6);
    expect(capStatus(o)).toBe('aboveCapWithinMargin');
  });

  it('child benefit uses HMRC rows on the spending side with the right sign and uprating', () => {
    const up = effectOf(run({ chb: 1 }, '2026-27'), 'chb');
    expect(up.currentSpending['2026-27']).toBeCloseTo(565, 6);
    expect(up.currentSpending['2027-28']).toBeCloseTo(575, 6);
    expect(up.currentSpending['2028-29']).toBeCloseTo(575, 6);
    expect(up.welfareInCap['2026-27']).toBeCloseTo(565, 6);
    expect(up.receipts['2026-27']).toBe(0);
    const down = effectOf(run({ chb: -1 }, '2026-27'), 'chb');
    expect(down.currentSpending['2026-27']).toBeCloseTo(-565, 6);
    expect(down.currentSpending['2027-28']).toBeCloseTo(-580, 6);
    expect(down.currentSpending['2028-29']).toBeCloseTo(-565, 6);
    const cb = headSeries(ds.vintage, 'childBenefit');
    const c = (y: string) => cb[y] ?? Number.NaN;
    const shifted = effectOf(run({ chb: 2 }), 'chb');
    expect(shifted.currentSpending['2026-27']).toBe(0);
    expect(shifted.currentSpending['2027-28']).toBeCloseTo(
      2 * 565 * (c('2027-28') / c('2026-27')),
      6,
    );
    expect(shifted.currentSpending['2030-31']).toBeCloseTo(
      2 * 575 * (c('2030-31') / c('2028-29')),
      6,
    );
    expect(shifted.steps.some((s) => s.formula.includes('childBenefit spending'))).toBe(true);
  });

  it('spending presets add up and interactions fire for overlapping levers', () => {
    const nhs = run({ dhsc: 2, otherd: -3 });
    const dhsc = effectOf(nhs, 'dhsc').currentSpending['2028-29'] ?? 0;
    const other = effectOf(nhs, 'otherd').currentSpending['2028-29'] ?? 0;
    expect(dhsc).toBeCloseTo(0.02 * 231977.319, 3);
    expect(other).toBeCloseTo(-0.03 * 128004.804, 3);
    expect(nhs.paths.deltas.currentSpending['2028-29']).toBeCloseTo(dhsc + other, 6);
    expect(nhs.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('met');
    expect(run({ wdis: -5, rvpip: 1 }).interactions.length).toBeGreaterThanOrEqual(1);
    expect(run({ wpens: 1, rvwfp: 1 }).interactions.length).toBeGreaterThanOrEqual(1);
    expect(run({ otherd: -2, rveff: 1 }).interactions.length).toBeGreaterThanOrEqual(1);
    expect(run({ dhsc: 1 }).interactions).toHaveLength(0);
  });

  it('a big departmental cut can break the investment rule only through PSNFL, and a big rise breaks stability', () => {
    const cut = run({ otherd: -10, dhsc: -10 });
    expect(cut.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm).toBeGreaterThan(
      cut.verdicts.find((v) => v.kind === 'currentBudget')?.baseline.headroomGbpm ?? 0,
    );
    const rise = run({ dhsc: 10, dfe: 10 });
    expect(rise.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('notMet');
  });
});
