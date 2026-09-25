import { describe, expect, it } from 'vitest';
import {
  budgetVerdict,
  computeOutcome,
  drawForecast,
  freshGame,
  macroCodesOf,
  pickOutcome,
  SEED_MAX,
  SEED_MIN,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset } from './fixtures.js';

const ds = loadDataset();
const context = ds.contexts[ds.contexts.length - 1];
if (!context) throw new Error('no context');
const MACRO = macroCodesOf(context.readings);
const typicalErrorGbpm =
  (ds.vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
  (ds.vintage.economy.nominalGdpFy.values['2030-31'] ?? 0);

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, ds.draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}

/** A finished playthrough: the envelope open, the sliders the OBR's, the package as given. */
function close(
  game: GamePermalink,
  policy: Record<string, number>,
  snapshot?: Record<string, number>,
  extra: { credibilityShare?: number; rebellionRisk?: number } = {},
) {
  const draw = drawForecast(game.seed, ds.draws, context!, ds.levers, ds.vintage);
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: {
      leverValues: { ...policy, ...draw.values },
      implementationYear: '2027-28',
      ...(Object.keys(game.delays).length > 0 ? { implementationYearByCode: game.delays } : {}),
      ...(Object.keys(draw.revisions).length > 0 ? { revisions: draw.revisions } : {}),
    },
  });
  return budgetVerdict({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    pm: ds.pm,
    options: ds.options,
    draws: ds.draws,
    context: context!,
    incidence: ds.incidence,
    kinds: ds.verdicts,
    game: { ...game, revealed: true },
    outcome,
    ...(snapshot ? { snapshot } : {}),
    macroCodes: MACRO,
    typicalErrorGbpm,
    credibilityShare: extra.credibilityShare ?? 0,
    rebellionRisk: extra.rebellionRisk ?? 0,
  });
}

describe('the close', () => {
  it('says how each ambition fared, and how each promise was lost', () => {
    const game: GamePermalink = {
      ...freshGame(seedFor('adviser-right')),
      priorities: ['safer-streets', 'nhs'],
      delays: { moj: '2028-29' },
    };
    const v = close(game, { moj: 10, dhsc: 1, itbr: 1 });
    const fates = Object.fromEntries(v.ambitions.priorities.map((p) => [p.title, p.fate]));
    // Prisons are on but pushed back a year; health has moved without getting there.
    expect(fates['Safer streets: prisons, police, borders']).toBe('delayed');
    expect(fates['Bring down NHS waiting lists']).toBe('narrowed');
    const lock = v.ambitions.promises.find((p) => p.title === 'The tax lock');
    expect(lock?.fate).toBe('broken-by-choice');
    expect(lock?.by).toEqual(['Basic rate']);
    // Every manifesto promise is judged; the rest were kept.
    expect(v.ambitions.promises).toHaveLength(ds.pm.promises.length);
    expect(v.ambitions.promises.filter((p) => p.fate === 'kept')).toHaveLength(
      ds.pm.promises.length - 1,
    );
  });

  it('totals who paid and who benefited from the engine’s own figures', () => {
    const game = { ...freshGame(seedFor('adviser-right')) };
    const v = close(game, { itbr: 1, ct: 1, dhsc: 3, rv2ch: 1 });
    const paid = Object.fromEntries(v.paid.map((r) => [r.group, r.gbpm]));
    expect(paid['broad-base']).toBeGreaterThan(8000);
    expect(paid['business']).toBeGreaterThan(3000);
    const benefited = Object.fromEntries(v.benefited.map((r) => [r.group, r.gbpm]));
    expect(benefited['nhs']).toBeGreaterThan(6000);
    // Reinstating the two-child limit takes money from families: a negative benefit.
    expect(benefited['families-on-benefits']).toBeLessThan(0);
    // Biggest first.
    for (let i = 1; i < v.paid.length; i += 1) {
      expect(Math.abs(v.paid[i - 1]!.gbpm)).toBeGreaterThanOrEqual(Math.abs(v.paid[i]!.gbpm));
    }
  });

  it('ranks the compromises since the desk by what they did to borrowing', () => {
    const game = {
      ...freshGame(seedFor('adviser-right')),
      priorities: ['nhs', 'schools-send'],
    };
    const v = close(game, { dhsc: 1.5, dfe: 5, ufsm: 0 }, { dhsc: 3, dfe: 5, ufsm: 1 });
    expect(v.compromises.map((c) => c.lever.code)).toEqual(['dhsc', 'ufsm']);
    expect(v.compromises[0]!.deltaGbpm).toBeLessThan(0);
    expect(v.compromises[0]!.from).toBe(3);
    expect(v.compromises[0]!.to).toBe(1.5);
    expect(close(game, { dhsc: 3 }, { dhsc: 3 }).compromises).toEqual([]);
  });

  it('re-runs the final package under every outcome, marking the one that arrived', () => {
    const seed = seedFor('sticky');
    const v = close({ ...freshGame(seed) }, { dhsc: 5 });
    expect(v.resilience).toHaveLength(ds.draws.outcomes.length);
    expect(v.resilience.filter((r) => r.drawn).map((r) => r.outcome.id)).toEqual(['sticky']);
    const byId = Object.fromEntries(v.resilience.map((r) => [r.outcome.id, r]));
    expect(byId.kindest!.headroomGbpm).toBeGreaterThan(byId['hard-line']!.headroomGbpm);
    // A package this thin misses the stability rule under the gloomiest outcome.
    expect(byId['hard-line']!.rulesMissed.length).toBeGreaterThan(0);
    expect(byId.kindest!.rulesMissed).toEqual([]);
    // The drawn row agrees with the outcome the player actually saw.
    expect(byId.sticky!.headroomGbpm).toBeCloseTo(v.headroomGbpm, 3);
  });

  it('names the kind of Budget from the closed list, first fit wins', () => {
    const seed = seedFor('adviser-right');
    const breach = close({ ...freshGame(seed), breachAccepted: true }, { def5: 1 });
    expect(breach.kind.id).toBe('breach-said-so');
    const missed = close({ ...freshGame(seed) }, { def5: 1 });
    expect(missed.kind.id).toBe('rules-missed');
    const cautious = close(
      { ...freshGame(seed), headroomTargetBn: 0, priorities: ['safer-streets'] },
      { itbr: 1 },
    );
    expect(cautious.kind.id).toBe('cautious');
    // Paid for by broadening the VAT base, which the tax lock does not name.
    const delivered = close(
      { ...freshGame(seed), priorities: ['safer-streets'] },
      { moj: 10, vatfood: 1 },
    );
    expect(delivered.kind.id).toBe('delivered-and-paid');
    expect(delivered.kind.title).toBe(
      'A safer streets Budget that delivered what it promised and paid for it',
    );
    // The first priority ranked names the Budget.
    const both = close(
      { ...freshGame(seed), priorities: ['defence', 'safer-streets'] },
      { moj: 10, dip47: 1, vatfood: 1 },
    );
    expect(both.kind.title).toBe(
      'A defence Budget that delivered what it promised and paid for it',
    );
    const quiet = close({ ...freshGame(seed) }, {});
    expect(quiet.kind.id).toBe('small-moves');
    expect(quiet.kind.line.badge).toBe('simulated');
  });
});
