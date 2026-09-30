import { describe, expect, it } from 'vitest';
import {
  AMPLE_HEADROOM_GBPM,
  THIN_HEADROOM_GBPM,
  budgetVerdict,
  computeOutcome,
  formatGbpBn,
  freshGame,
  isMissed,
  type GamePermalink,
} from '../src/index.js';
import { filledFrom, loadDataset, outcomeOfFor, wording } from './fixtures.js';
import {
  BIG_BROAD_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  EMPLOYER_NICS,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  NEEDED_LOCK_BREAK,
  NICS_WALK,
  PENNY,
  PRISONS,
  SECURITY,
  SECURITY_FLAGSHIPS,
  THIN_MARGIN,
  TWO_CHILD_LIMIT,
  UNPROMISED_TAXES,
  WALK,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });
const typicalErrorGbpm = typicalError(ds);

/** A delivered Budget: today's estimate, the package as given. */
function close(
  game: GamePermalink,
  policy: Budget,
  extra: { credibilityShare?: number; rebellionRisk?: number } = {},
) {
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE }, implementationYear: '2027-28' },
  });
  return {
    outcome,
    verdict: budgetVerdict({
      levers: ds.levers,
      pm: ds.pm,
      options: ds.options,
      incidence: ds.incidence,
      kinds: ds.verdicts,
      game,
      outcome,
      typicalErrorGbpm,
      credibilityShare: extra.credibilityShare ?? 0,
      rebellionRisk: extra.rebellionRisk ?? 0,
      outcomeOf,
    }),
  };
}
const verdictOf = (...args: Parameters<typeof close>) => close(...args).verdict;
const priorityTitle = (id: string) => ds.pm.priorities.find((p) => p.id === id)?.title ?? id;
/** A priority in running words, as the Prime Minister's file names it. */
const noun = (id: string) => ds.pm.priorities.find((p) => p.id === id)?.noun ?? id;
/** What the close calls the levers of a Budget: their short titles. */
const shortTitles = (budget: Budget) =>
  Object.keys(budget).map((code) => ds.levers.find((l) => l.code === code)?.shortTitle ?? code);
/** A kind of Budget as the verdicts file writes it, before the close fills it in. */
const kindOf = (id: string) => {
  const kind = ds.verdicts.kinds.find((k) => k.id === id);
  if (!kind) throw new Error(`the verdicts file has no kind ${id}`);
  return kind;
};
const headroomOf = (outcome: ReturnType<typeof outcomeOf>) =>
  outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? Number.NaN;

const budget = (
  game: GamePermalink,
  policy: Budget,
  extra: { credibilityShare?: number; rebellionRisk?: number } = {},
) => ({ game, policy, extra });
/** The Budgets the close is read on, each named for the part it plays. */
const CASES = {
  'the day-to-day rule missed': budget(freshGame(), DAY_TO_DAY_RULE_MISSED),
  'a big broad tax rise, safer streets left': budget(
    gameWith(['safer-streets']),
    BIG_BROAD_TAX_RISE,
  ),
  'the same on uncertified costings': budget(gameWith(['safer-streets']), BIG_BROAD_TAX_RISE, {
    credibilityShare: 1,
  }),
  'a penny for a buffer': budget(gameWith(['safer-streets']), PENNY),
  'prisons paid for by taxes no promise names': budget(gameWith(['safer-streets']), {
    ...PRISONS,
    ...UNPROMISED_TAXES,
  }),
  'both flagships paid for by taxes no promise names': budget(gameWith(SECURITY), {
    ...SECURITY_FLAGSHIPS,
    ...UNPROMISED_TAXES,
  }),
  'nothing at all': budget(freshGame(), {}),
  'the walk': budget(gameWith(SECURITY), WALK),
  'a lock break the NHS needed': budget(gameWith(['nhs']), NEEDED_LOCK_BREAK),
  'prisons, defence left with room': budget(gameWith(SECURITY), PRISONS),
  'a health cut': budget(gameWith(['nhs']), HEALTH_CUT),
  'prisons and a restive party': budget(gameWith(['safer-streets']), PRISONS, {
    rebellionRisk: 3,
  }),
  'a penny and health above plan': budget(freshGame(), { ...PENNY, ...HEALTH_ABOVE_PLAN }),
  'a small tobacco rise': budget(freshGame(), { tob: 10 }),
  'a thin margin, every promise kept': budget(gameWith(['safer-streets']), THIN_MARGIN),
};
type Case = keyof typeof CASES;
const closed = new Map<Case, ReturnType<typeof close>>();
/** A named Budget, closed once. */
function read(name: Case) {
  const hit = closed.get(name);
  if (hit) return hit;
  const { game, policy, extra } = CASES[name];
  const done = close(game, policy, extra);
  closed.set(name, done);
  return done;
}

describe('the close', () => {
  it('reads as recorded; a rewording is an updated snapshot and a reviewed diff', () => {
    const said = Object.fromEntries(
      (Object.keys(CASES) as Case[]).map((name) => {
        const { kind } = read(name).verdict;
        return [
          name,
          [`${kind.id}: ${kind.title}`, kind.line.short, kind.line.text, kind.fact]
            .filter((line) => line !== undefined)
            .map(wording),
        ];
      }),
    );
    expect(said).toMatchSnapshot();
  });

  it('says how each ambition fared, and how each promise was lost', () => {
    const game = gameWith(['safer-streets', 'nhs']);
    // Prisons are funded as chosen; health has moved without getting there: settled lower.
    const trimmed = { ...PRISONS, dhsc: 1 };
    const v = verdictOf(game, { ...trimmed, ...PENNY });
    const fates = Object.fromEntries(v.ambitions.priorities.map((p) => [p.title, p.fate]));
    expect(fates[priorityTitle('safer-streets')]).toBe('delivered');
    expect(fates[priorityTitle('nhs')]).toBe('settledLower');
    const lockTitle = ds.pm.promises.find((p) => p.id === 'tax-lock')?.title;
    const lock = v.ambitions.promises.find((p) => p.title === lockTitle);
    expect(lock?.fate).toBe('broken-by-choice');
    expect(lock?.by).toEqual(shortTitles(PENNY));
    // Amber (Phase 23): paid for by employer National Insurance instead, the lock is kept in its
    // words and strained.
    const employer = verdictOf(game, { ...trimmed, ...EMPLOYER_NICS });
    const strained = employer.ambitions.promises.find((p) => p.title === lockTitle);
    expect(strained?.fate).toBe('strained');
    expect(strained?.by).toEqual(shortTitles(EMPLOYER_NICS));
    // Every manifesto promise is judged; the rest were kept.
    expect(v.ambitions.promises).toHaveLength(ds.pm.promises.length);
    expect(v.ambitions.promises.filter((p) => p.fate === 'kept')).toHaveLength(
      ds.pm.promises.length - 1,
    );
  });

  it('totals who paid and who benefited from the engine’s own figures', () => {
    const v = verdictOf(freshGame(), {
      ...PENNY,
      ct: 1,
      ...HEALTH_ABOVE_PLAN,
      ...TWO_CHILD_LIMIT,
    });
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

  it('judges the Budget on the figures the player saw, and nothing else', () => {
    const { outcome, verdict } = close(freshGame(), HEALTH_ABOVE_PLAN);
    const stability = outcome.verdicts.find((r) => r.kind === 'currentBudget');
    expect(verdict.headroomGbpm).toBe(stability?.headroomGbpm);
    expect(verdict.targetYear).toBe('2029-30');
    // Phase 24 retired the forecast that arrived later: no compromises since it, no re-runs.
    expect(Object.keys(verdict).sort()).toEqual([
      'ambitions',
      'benefited',
      'headroomGbpm',
      'kind',
      'paid',
      'targetYear',
    ]);
  });

  it('names the kind of Budget from the closed list, first fit wins', () => {
    const kind = (name: Case) => read(name).verdict.kind;
    expect(kind('the day-to-day rule missed').id).toBe('rules-missed');
    // Cautious: rules met with ample headroom from certified costings, and nothing done for the
    // priorities. Employer National Insurance strains the tax lock and breaks nothing.
    const cautious = read('a big broad tax rise, safer streets left').verdict;
    expect(cautious.headroomGbpm).toBeGreaterThanOrEqual(AMPLE_HEADROOM_GBPM);
    expect(cautious.kind.id).toBe('cautious');
    // Uncertified costings are not caution (Phase 25), and the line no longer speaks for markets.
    expect(kind('the same on uncertified costings').id).not.toBe('cautious');
    expect(cautious.kind.title).not.toMatch(/markets/);
    // A penny on the basic rate breaks the tax lock the rules did not need broken.
    expect(kind('a penny for a buffer').id).toBe('broke-for-buffer');
    // Paid for by taxes no promise names: the family-home allowance and the biggest homes.
    const delivered = kind('prisons paid for by taxes no promise names');
    expect(delivered.id).toBe('delivered-and-paid');
    expect(filledFrom(kindOf(delivered.id).title, delivered.title)).toBe(true);
    expect(delivered.title).toContain(noun('safer-streets'));
    // The first priority ranked names the Budget.
    const both = kind('both flagships paid for by taxes no promise names');
    expect(both.id).toBe('delivered-and-paid');
    expect(both.title).toContain(noun('defence'));
    expect(both.title).not.toContain(noun('safer-streets'));
    const quiet = kind('nothing at all');
    expect(quiet.id).toBe('small-moves');
    expect(quiet.line.badge).toBe('simulated');
  });

  it('checks the trade-offs it names by re-running the engine on the same estimate', () => {
    // The walk: the tax lock broken for a margin the rules did not need.
    const broke = read('the walk').verdict.kind;
    expect(broke.id).toBe('broke-for-buffer');
    const without = outcomeOf({ ...NICS_WALK, ...ESTIMATE });
    expect(without.verdicts.some(isMissed)).toBe(false);
    // The fact names what broke the promise, and the headroom the re-run leaves without it.
    expect(filledFrom(kindOf(broke.id).fact, broke.fact)).toBe(true);
    const breakers = Object.keys(WALK).filter((code) => !(code in NICS_WALK));
    expect(breakers.length).toBeGreaterThan(0);
    for (const code of breakers) {
      expect(broke.fact).toContain(ds.levers.find((l) => l.code === code)?.noun);
    }
    expect(broke.fact).toContain(formatGbpBn(headroomOf(without), 1));
    // A break the rules did need is the price of the programme, not a buffer.
    expect(read('a lock break the NHS needed').verdict.kind.id).toBe('broke-the-lock');
    // A priority left out though the rules would hold with it paid for, and what it would cost:
    // a way to deliver it in full, re-run on the same Budget, with the headroom it would leave.
    const left = read('prisons, defence left with room').verdict.kind;
    expect(left.id).toBe('left-out-with-room');
    expect(filledFrom(kindOf(left.id).line.short, left.line.short)).toBe(true);
    expect(left.line.short).toContain(noun('defence'));
    expect(filledFrom(kindOf(left.id).fact, left.fact)).toBe(true);
    expect(left.fact).toContain(noun('defence'));
    const way = ds.options.deliver.find(
      (o) => o.priority === 'defence' && o.scale.kind === 'full' && left.fact?.includes(o.title),
    );
    if (!way) throw new Error(`no way to deliver defence in full is named in "${left.fact}"`);
    const withWay = outcomeOf({ ...PRISONS, ...ESTIMATE, ...way.values });
    expect(withWay.verdicts.some(isMissed)).toBe(false);
    expect(left.fact).toContain(formatGbpBn(headroomOf(withWay), 1));
    // Paid for by cuts: named by who gets less, ahead of a cautious reading of the same margin.
    const cuts = read('a health cut').verdict;
    expect(cuts.kind.id).toBe('paid-by-cuts');
    expect(filledFrom(kindOf(cuts.kind.id).line.short, cuts.kind.line.short)).toBe(true);
    const losers = cuts.benefited.find((r) => r.gbpm < 0);
    expect(cuts.kind.line.short?.toLowerCase()).toContain(losers?.label.toLowerCase());
    // A restive party outranks a thin margin kept with every promise.
    expect(read('prisons and a restive party').verdict.kind.id).toBe('restive-party');
    // Size is measured, not assumed: big moves and small ones, each without a claim it cannot keep.
    expect(read('a penny and health above plan').verdict.kind.id).toBe('big-moves');
    const small = read('a small tobacco rise').verdict.kind;
    expect(small.id).toBe('small-moves');
    expect(small.line.text).not.toMatch(/markets/i);
    for (const kind of ds.verdicts.kinds) {
      expect(`${kind.title} ${kind.line.text}`).not.toMatch(/OBR’s arithmetic|OBR’s test/);
    }
  });

  it('calls a margin thin under ten billion, as the markets do, and not above it', () => {
    // Every promise kept and the priority delivered; only the margin differs.
    const thin = read('a thin margin, every promise kept').verdict;
    expect(thin.headroomGbpm).toBeLessThan(THIN_HEADROOM_GBPM);
    expect(thin.kind.id).toBe('kept-everything-thin');
    // Over ten billion and under the old line (half the typical forecast error, about £16bn),
    // which once called this thin too.
    const modest = read('prisons paid for by taxes no promise names').verdict;
    expect(modest.headroomGbpm).toBeGreaterThan(THIN_HEADROOM_GBPM);
    expect(modest.headroomGbpm).toBeLessThan(typicalErrorGbpm / 2);
    expect(modest.kind.id).toBe('delivered-and-paid');
  });

  it('draws the thin and ample lines where the markets’ bands do', () => {
    const rule = ds.reception.audiences.flatMap((a) => a.rules).find((r) => r.id === 'mk-headroom');
    const ceilings = Object.fromEntries((rule?.bands ?? []).map((b) => [b.id, b.upTo]));
    expect(THIN_HEADROOM_GBPM).toBe(ceilings.thin);
    expect(AMPLE_HEADROOM_GBPM).toBe(ceilings.modest);
    // No verdict kind reads a target the player set: Phase 24 has none.
    for (const kind of ds.verdicts.kinds) {
      expect(Object.keys(kind.when)).not.toContain('headroomAtLeastTarget');
      expect(Object.keys(kind.when)).not.toContain('breachAccepted');
    }
  });
});
