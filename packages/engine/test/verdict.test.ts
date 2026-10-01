import { describe, expect, it } from 'vitest';
import { THIN_HEADROOM_GBPM, computeOutcome, incidenceRows } from '../src/index.js';
import { loadDataset } from './fixtures.js';
import { HEALTH_ABOVE_PLAN, PENNY, TWO_CHILD_LIMIT, todaysEstimate } from './scenarios.js';

const ds = loadDataset();
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = todaysEstimate(ds);

describe('who paid, and the thin line', () => {
  it('totals who paid and who benefited from the engine’s own figures', () => {
    const outcome = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: {
        leverValues: { ...PENNY, ct: 1, ...HEALTH_ABOVE_PLAN, ...TWO_CHILD_LIMIT, ...ESTIMATE },
        implementationYear: '2027-28',
      },
    });
    const year = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
    const rows = incidenceRows(outcome, ds.levers, ds.incidence, year);
    const paid = Object.fromEntries(rows.paid.map((r) => [r.group, r.gbpm]));
    expect(paid['broad-base']).toBeGreaterThan(8000);
    expect(paid['business']).toBeGreaterThan(3000);
    const benefited = Object.fromEntries(rows.benefited.map((r) => [r.group, r.gbpm]));
    expect(benefited['nhs']).toBeGreaterThan(6000);
    // Reinstating the two-child limit takes money from families: a negative benefit.
    expect(benefited['families-on-benefits']).toBeLessThan(0);
    // Biggest first.
    for (let i = 1; i < rows.paid.length; i += 1) {
      expect(Math.abs(rows.paid[i - 1]!.gbpm)).toBeGreaterThanOrEqual(Math.abs(rows.paid[i]!.gbpm));
    }
  });

  it('draws the thin line where the markets’ bands do', () => {
    const rule = ds.reception.audiences.flatMap((a) => a.rules).find((r) => r.id === 'mk-headroom');
    const ceilings = Object.fromEntries((rule?.bands ?? []).map((b) => [b.id, b.upTo]));
    expect(THIN_HEADROOM_GBPM).toBe(ceilings.thin);
  });
});
