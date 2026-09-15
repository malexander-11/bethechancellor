import { describe, expect, it } from 'vitest';
import { computeOutcome } from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const base = computeOutcome({ vintage: ds.vintage, rules: ds.rules, levers: ds.levers });
const run = (leverValues: Record<string, number>, extra: Record<string, unknown> = {}) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, ...extra },
  });

describe('macro assumption sliders use the OBR sensitivities', () => {
  it('interest rates +1pp adds £15bn to borrowing in 2030-31 and no extra interest of its own', () => {
    const o = run({ rate: 1 });
    expect(
      (o.paths.policy.psnb['2030-31'] ?? 0) - (base.paths.policy.psnb['2030-31'] ?? 0),
    ).toBeCloseTo(15000, 6);
    expect(
      (o.paths.policy.psnb['2026-27'] ?? 0) - (base.paths.policy.psnb['2026-27'] ?? 0),
    ).toBeCloseTo(10000, 6);
    expect(o.paths.deltas.debtInterest['2030-31']).toBe(0);
    expect(o.paths.deltas.marginalRatePct['2029-30']).toBeCloseTo(5.5, 9);
    const stability = o.verdicts.find((v) => v.ruleId === 'stability');
    expect(stability?.headroomGbpm).toBeCloseTo(23600 - 15000, 6);
    expect(o.attribution).toHaveLength(1);
    expect(o.attribution[0]).toMatchObject({
      kind: 'macro',
      code: 'rate',
      currentBudgetGbpm: 15000,
    });
    expect(o.warnings.length).toBeGreaterThan(0);
  });

  it('interest rates −1pp lowers borrowing symmetrically', () => {
    const o = run({ rate: -1 });
    expect(
      (o.paths.policy.psnb['2030-31'] ?? 0) - (base.paths.policy.psnb['2030-31'] ?? 0),
    ).toBeCloseTo(-15000, 6);
  });

  it('growth +0.1pp a year lowers borrowing by £8bn in 2030-31 and compounds the GDP denominators', () => {
    const o = run({ ngdp: 0.1 });
    expect(
      (o.paths.policy.psnb['2030-31'] ?? 0) - (base.paths.policy.psnb['2030-31'] ?? 0),
    ).toBeCloseTo(-8000, 6);
    expect(
      (o.paths.policy.nominalGdpFy['2030-31'] ?? 0) /
        (base.paths.policy.nominalGdpFy['2030-31'] ?? 1),
    ).toBeCloseTo(1.001 ** 5, 9);
    expect(o.paths.policy.psnflPctGdp['2029-30']).toBeLessThan(
      base.paths.policy.psnflPctGdp['2029-30'] ?? 0,
    );
  });

  it('RPI is asymmetric: +1pp costs £11bn, −1pp saves £10bn', () => {
    expect(
      (run({ rpi: 1 }).paths.policy.psnb['2030-31'] ?? 0) -
        (base.paths.policy.psnb['2030-31'] ?? 0),
    ).toBeCloseTo(11000, 6);
    expect(
      (run({ rpi: -1 }).paths.policy.psnb['2030-31'] ?? 0) -
        (base.paths.policy.psnb['2030-31'] ?? 0),
    ).toBeCloseTo(-10000, 6);
  });

  it('snaps values to the control step and ignores unknown codes with a warning', () => {
    const o = run({ rate: 0.3, bogus: 2 });
    expect(o.leverEffects[0]?.value).toBe(0.25);
    expect(o.warnings.some((w) => w.includes('bogus'))).toBe(true);
  });

  it('the September 2026 preset shrinks headroom by three-quarters of the 2029-30 sensitivity', () => {
    const preset = ds.presets.presets.find((p) => p.id === 'higher-gilt-yields-2026-09');
    const o = run(preset?.leverValues ?? {});
    const stability = o.verdicts.find((v) => v.ruleId === 'stability');
    expect(stability?.headroomGbpm).toBeCloseTo(23600 - 0.75 * 15000, 6);
  });
});
