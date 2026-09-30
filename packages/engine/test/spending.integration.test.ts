import { describe, expect, it } from 'vitest';
import {
  computeOutcome,
  headSeries,
  type Lever,
  type Settings,
  type WelfareCapRule,
} from '../src/index.js';
import { TOGGLE, loadDataset, syntheticLever } from './fixtures.js';

/**
 * Spending and welfare on the engine: the cap, the sign of a benefit costed from HMRC's rows, and
 * changes that add up. The measures are made up, with round numbers or sized from the published
 * forecast, so a real lever's re-costing never moves these.
 */
const ds = loadDataset();
const run = (
  levers: Lever[],
  leverValues: Record<string, number>,
  settings: Partial<Settings> = {},
) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers,
    settings: { leverValues, ...settings },
  });
const capStatus = (o: ReturnType<typeof run>) =>
  o.verdicts.find((v) => v.kind === 'welfareCap')?.status;
const saving = (code: string, gbpm: number, insideWelfareCap: boolean) =>
  syntheticLever({
    code,
    category: 'welfare',
    control: TOGGLE,
    classification: { side: 'spending', insideWelfareCap },
    costing: {
      kind: 'schedule',
      effect: { '2027-28': -gbpm, '2028-29': -gbpm, '2029-30': -gbpm, '2030-31': -gbpm },
      source: { sourceId: 'hmt-budget-2025-table-4-1' },
      caveats: [],
    },
  });

describe('spending, welfare and the welfare cap', () => {
  it('moves the cap verdict from within the margin to within the cap as capped welfare falls', () => {
    const rule = ds.rules.rules.find((r): r is WelfareCapRule => r.kind === 'welfareCap');
    if (!rule) throw new Error('no welfare cap');
    const planned = ds.vintage.fiscal.welfareInCap.values[rule.capYear] ?? Number.NaN;
    // The March forecast has capped welfare above the cap, inside its margin.
    const above = planned - rule.capGbpm;
    expect(above).toBeGreaterThan(0);
    expect(capStatus(run([], {}))).toBe('aboveCapWithinMargin');
    const part = saving('xpart', above / 2, true);
    const whole = saving('xwhole', above + 1, true);
    const levers = [part, whole];
    const partly = run(levers, { xpart: 1 });
    expect(partly.paths.policy.welfareInCap[rule.capYear]).toBeCloseTo(planned - above / 2, 6);
    expect(capStatus(partly)).toBe('aboveCapWithinMargin');
    expect(capStatus(run(levers, { xwhole: 1 }))).toBe('withinCap');
    // The same saving outside the cap leaves the cap's verdict where it was.
    expect(capStatus(run([saving('xelse', above + 1, false)], { xelse: 1 }))).toBe(
      'aboveCapWithinMargin',
    );
  });

  it('costs a benefit from HMRC’s rows on the spending side, with their sign, grown with its line', () => {
    const benefit = syntheticLever({
      code: 'xbenefit',
      category: 'welfare',
      control: { unit: 'GBP', min: -5, max: 5, step: 1 },
      classification: { side: 'spending', insideWelfareCap: true },
      costing: {
        kind: 'linearPerUnit',
        unitDelta: 1,
        perUnit: { '2026-27': 565, '2027-28': 575, '2028-29': 575 },
        decreasePerUnit: { '2026-27': -565, '2027-28': -580, '2028-29': -565 },
        basis: 'accruals',
        symmetric: false,
        source: { sourceId: 'hmrc-trr-2025-06' },
        uprating: { method: 'growWithSeries', head: 'childBenefit', note: 'Grows with the line.' },
        caveats: [],
      },
    });
    const effectOf = (value: number, settings: Partial<Settings> = {}) => {
      const e = run([benefit], { xbenefit: value }, settings).leverEffects[0];
      if (!e) throw new Error('no effect');
      return e;
    };
    const up = effectOf(1, { implementationYear: '2026-27' });
    expect(up.currentSpending['2026-27']).toBeCloseTo(565, 6);
    expect(up.currentSpending['2027-28']).toBeCloseTo(575, 6);
    expect(up.welfareInCap['2026-27']).toBeCloseTo(565, 6);
    expect(up.receipts['2026-27']).toBe(0);
    const down = effectOf(-1, { implementationYear: '2026-27' });
    expect(down.currentSpending['2026-27']).toBeCloseTo(-565, 6);
    expect(down.currentSpending['2027-28']).toBeCloseTo(-580, 6);
    const line = headSeries(ds.vintage, 'childBenefit');
    const c = (y: string) => line[y] ?? Number.NaN;
    const shifted = effectOf(2);
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

  it('adds spending changes up, whatever each one is', () => {
    const levers = [saving('xa', 400, true), saving('xb', -900, false)];
    const both = run(levers, { xa: 1, xb: 1 });
    const each = both.leverEffects.map((e) => e.currentSpending['2028-29'] ?? 0);
    expect(each).toHaveLength(2);
    expect(both.paths.deltas.currentSpending['2028-29']).toBeCloseTo(each[0]! + each[1]!, 6);
  });

  it('lets a big departmental cut lift the current budget, and a big rise break the stability rule', () => {
    const live = (values: Record<string, number>) => run(ds.levers, values);
    const cut = live({ otherd: -10, dhsc: -10 });
    const stability = cut.verdicts.find((v) => v.kind === 'currentBudget');
    expect(stability?.headroomGbpm).toBeGreaterThan(stability?.baseline.headroomGbpm ?? 0);
    const rise = live({ dhsc: 10, dfe: 10 });
    expect(rise.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('notMet');
  });
});
