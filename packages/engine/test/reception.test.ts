import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  computeOutcome,
  formatGbpBn,
  ratingOf,
  receptions,
  type Outcome,
  type Reason,
  type Reception,
} from '../src/index.js';
import { filledFrom, loadDataset, outcomeOfFor, readJson, wording } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  BIG_BROAD_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  DEBT_RULE_MISSED,
  DEFENCE_GAP,
  EMPLOYER_NICS,
  ESTATES_AND_HOMES_PAY,
  FRONT_LOADED,
  HEALTH_CUT,
  INVESTMENT,
  MOVES,
  NHS_START,
  PENNY,
  PRISONS,
  PROGRAMME,
  SECURITY_FLAGSHIPS,
  TAXES_AT_THE_TOP,
  TWO_CHILD_LIMIT,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const outcomeOf = outcomeOfFor(ds);
const typicalErrorGbpm = typicalError(ds);
/** What the audiences' reasons call a lever. */
const noun = (code: string) => {
  const lever = ds.levers.find((l) => l.code === code);
  return lever?.noun ?? lever?.shortTitle ?? code;
};
/** What the audiences' reasons call the levers of a Budget. */
const causes = (budget: Budget) => Object.keys(budget).map(noun);
/** The group a lever's tax falls on, as the incidence file names it. */
const groupOf = (code: string) => ds.incidence.groups[ds.incidence.levers[code] ?? ''];
const headroomOf = (outcome: Outcome) =>
  outcome.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? Number.NaN;
const RULES = new Map(ds.reception.audiences.flatMap((a) => a.rules).map((r) => [r.id, r]));
/**
 * The band a reason's words came from, by its id, or by its id and the reading that chose a
 * variant's words: "thin (headroomChangeGbpm)". Read from the data, so rewording a band moves a
 * snapshot, not this.
 */
function bandOf(reason: Reason | undefined): string | undefined {
  for (const band of (reason && RULES.get(reason.rule)?.bands) ?? []) {
    if (filledFrom(band.text, reason?.text)) return band.id;
    const variant = band.variants?.find((v) => filledFrom(v.text, reason?.text));
    if (variant) return `${band.id} (${variant.when.measure})`;
  }
  return undefined;
}
/** The words of some reasons, for a snapshot: a rewording is an updated snapshot and a diff. */
const said = (...reasons: (Reason | undefined)[]) => reasons.map((r) => wording(r?.text));
const run = (leverValues: Budget) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues },
  });
function room(leverValues: Budget): Reception[] {
  const outcome = run(leverValues);
  return receptions({
    outcome,
    levers: ds.levers,
    reception: ds.reception,
    typicalErrorGbpm,
    outcomeOf,
    incidence: ds.incidence,
    status: ambitionStatus(ds.pm, outcome, ds.levers),
  });
}
const by = (list: Reception[], id: Reception['audience']) => {
  const r = list.find((x) => x.audience === id);
  if (!r) throw new Error(`no ${id}`);
  return r;
};
const FIGURE = /£\d|\d{3},\d{3}|\d+%/;

describe('cards that agree with their ratings (Phase 25)', () => {
  // Moves a player can make, a few at a time; a sample of Budgets, not every one.
  const budgets = fc
    .subarray([...MOVES], { maxLength: 5 })
    .map((picked) => picked.reduce<Record<string, number>>((acc, m) => ({ ...acc, ...m }), {}));
  const words = (s: string) => s.split(/\s+/).filter((w) => w && w !== '·').length;

  it('shows one reason that never contradicts the rating, and names the other side briefly', () => {
    fc.assert(
      fc.property(budgets, (values) => {
        for (const r of room(values)) {
          const lead = r.lead;
          if (r.rating > 3) expect(lead?.points, r.audience).toBeGreaterThan(0);
          if (r.rating < 3) expect(lead?.points, r.audience).toBeLessThan(0);
          if (r.rating === 3 && lead) expect(lead.points, r.audience).toBeLessThan(0);
          expect(r.reasons[0]).toBe(lead);
          // The other side, when there is one, in a line of eight words or fewer.
          const opposite = r.all.some((x) =>
            lead ? (lead.points < 0 ? x.points > 0 : x.points < 0) : false,
          );
          expect(r.counted !== undefined, r.audience).toBe(opposite);
          if (r.counted) {
            expect(r.counted.side).toBe(lead && lead.points < 0 ? 'for' : 'against');
            expect(
              words(`Counted ${r.counted.side}: ${r.counted.labels.join(' · ')}`),
            ).toBeLessThanOrEqual(8);
          }
        }
      }),
      { numRuns: 60, seed: 20260928 },
    );
  });

  it('writes levels without a plus, points of the economy in words, and causes in running words', () => {
    fc.assert(
      fc.property(budgets, (values) => {
        for (const r of room(values)) {
          for (const x of r.all) {
            expect(x.text, x.rule).not.toMatch(/of \+£|by \+|percentage points/);
            for (const cause of x.causes) expect(cause, x.rule).not.toMatch(/^[A-Z]/);
          }
        }
      }),
      { numRuns: 40, seed: 7 },
    );
  });

  it('never blames a saving for more borrowing, nor a rise for a thin margin', () => {
    // A welfare saving and a big health rise: borrowing is up because of the health rise only.
    const mixed = by(room({ rvpip: 1, dhsc: 10 }), 'markets');
    const borrowing = mixed.all.find((r) => r.rule === 'mk-borrowing');
    expect(borrowing?.points).toBe(-1);
    expect(borrowing?.causes).toContain(noun('dhsc'));
    expect(borrowing?.causes).not.toContain(noun('rvpip'));
    const headroom = mixed.all.find((r) => r.rule === 'mk-headroom');
    expect(headroom?.points).toBeLessThan(0);
    expect(headroom?.causes).not.toContain(noun('rvpip'));
    // A band that scores nothing names no cause for a level: "less than March left" is not the
    // player's doing.
    const modest = by(room({ dhsc: 1 }), 'markets').all.find((r) => r.rule === 'mk-headroom');
    if (modest?.points === 0) expect(modest.causes).toEqual([]);
  });

  it('says a margin truly: the Chancellor’s is modest, a big rise is plenty, a spending rise is thin', () => {
    const headroom = (values: Budget) =>
      by(room(values), 'markets').all.find((r) => r.rule === 'mk-headroom');
    // The Chancellor's own headroom: under twenty billion, set against the OBR's typical forecast
    // error, the engine's own figure.
    const same = headroom({});
    expect(bandOf(same)).toBe('modest');
    expect(same?.text).toContain(formatGbpBn(headroomOf(run({})), 1));
    expect(same?.text).toContain(formatGbpBn(typicalErrorGbpm, 0));
    // A big broad tax rise: more than the average margin since 2010, and said so.
    const more = headroom(BIG_BROAD_TAX_RISE);
    expect(bandOf(more)).toBe('plenty');
    expect(more?.text).toContain(formatGbpBn(headroomOf(run(BIG_BROAD_TAX_RISE)), 1));
    // Spending that leaves under ten billion: thin.
    const less = headroom({ dhsc: 5 });
    expect(bandOf(less)).toBe('thin');
    expect(said(same, more, less)).toMatchSnapshot();
  });

  it('names who pays from the groups that actually pay', () => {
    const whoPays = (values: Budget) =>
      by(room(values), 'backbenchers').all.find((r) => r.rule === 'bb-who-pays');
    const named = (reason: Reason | undefined, budget: Budget) => {
      for (const code of Object.keys(budget)) {
        expect(reason?.text.toLowerCase(), code).toContain(groupOf(code)?.label.toLowerCase());
      }
    };
    const broad = whoPays(PENNY);
    expect(bandOf(broad)).toBe('broad');
    named(broad, PENNY);
    const atTheTop = { ...TAXES_AT_THE_TOP, ...ESTATES_AND_HOMES_PAY };
    const top = whoPays(atTheTop);
    expect(bandOf(top)).toBe('top');
    named(top, atTheTop);
    expect(said(broad, top)).toMatchSnapshot();
  });

  it('quotes one gilt yield across the files, and it is the forecast’s', () => {
    const files = [readJson('journey/reception.json'), readJson('journey/households.json')].map(
      (x) => JSON.stringify(x),
    );
    const assumed = ds.vintage.economy.conditioningAssumptions.giltYield10yPct?.value ?? 0;
    expect(assumed.toFixed(1)).toBe('5.0');
    for (const f of files) {
      for (const quoted of f.match(/gilt yields? (?:were |at |of )?(?:about )?\d\.\d%/g) ?? []) {
        expect(quoted.endsWith(`${assumed.toFixed(1)}%`), quoted).toBe(true);
      }
    }
    expect(files.join(' ')).toMatch(/5\.0%/);
  });
});

describe('three audiences, recalibrated on today’s estimate (Phase 25)', () => {
  /** Today's estimate: every game is played on it (Phase 24). */
  const ESTIMATE = todaysEstimate(ds);
  /** The three priorities, one way each and borders too, with nothing to pay for them. */
  // Past both rules: the programme, with investment on top, misses the debt rule too.
  const THREE = { ...PROGRAMME, ...INVESTMENT };
  const at = (policy: Budget) => room({ ...ESTIMATE, ...policy });
  const rule = (list: Reception[], audience: Reception['audience'], id: string) =>
    by(list, audience).all.find((r) => r.rule === id);

  it('measures the markets from before the Budget: doing nothing is Watchful', () => {
    const nothing = at({});
    expect(by(nothing, 'markets').rating).toBe(3);
    // Nothing moved, so borrowing has not changed.
    expect(rule(nothing, 'markets', 'mk-borrowing')?.points).toBe(0);
    const headroom = rule(nothing, 'markets', 'mk-headroom');
    expect(headroom?.points).toBe(0);
    // Modest: the Chancellor's own margin, with nothing of the player's behind it.
    expect(bandOf(headroom)).toBe('modest');
    expect(headroom?.causes).toEqual([]);
    expect(said(headroom)).toMatchSnapshot();
  });

  it('makes a missed rule cost something with every audience', () => {
    const missing: Budget[] = [
      THREE,
      { dhsc: 10, dfe: 10, ...PRISONS, ...DEBT_RULE_MISSED },
      BASIC_RATE_CUT,
    ];
    for (const policy of missing) {
      const r = at(policy);
      const name = JSON.stringify(policy);
      expect(by(r, 'markets').rating, name).toBe(1);
      expect(by(r, 'backbenchers').rating, name).toBeLessThanOrEqual(3);
      expect(by(r, 'public').rating, name).toBeLessThanOrEqual(3);
      expect(rule(r, 'public', 'pb-rules-missed')?.points, name).toBe(-1);
      expect(rule(r, 'backbenchers', 'bb-rules-missed')?.points, name).toBe(-1);
    }
    // Either rule, the same cap, and the size of the miss in the reason: the engine's own margin.
    const three = run({ ...ESTIMATE, ...THREE });
    const missedBy = (kind: string) =>
      formatGbpBn(Math.abs(three.verdicts.find((v) => v.kind === kind)?.headroomGbpm ?? NaN), 1);
    const debt = rule(at(THREE), 'markets', 'mk-debt-rule');
    expect(bandOf(debt)).toBe('missed');
    expect(debt?.text).toContain(missedBy('stockFalling'));
    const dayToDay = rule(at(THREE), 'markets', 'mk-headroom');
    expect(bandOf(dayToDay)).toBe('missed');
    expect(dayToDay?.text).toContain(missedBy('currentBudget'));
    expect(said(debt, dayToDay)).toMatchSnapshot();
  });

  it('never rewards borrowing past the rules over paying for the same priorities', () => {
    const borrowed = at(THREE);
    // Paid for from the top, crossing no red line.
    const funded = at({ ...THREE, ...ESTATES_AND_HOMES_PAY });
    expect(by(borrowed, 'markets').rating).toBeLessThan(by(funded, 'markets').rating);
    expect(by(borrowed, 'backbenchers').rating).toBeLessThanOrEqual(
      by(funded, 'backbenchers').rating,
    );
    expect(by(borrowed, 'public').rating).toBeLessThanOrEqual(3);
    expect(by(borrowed, 'public').rating).toBeLessThanOrEqual(by(funded, 'public').rating);
  });

  it('sees cuts to services, counted one by one, never netted away', () => {
    const nhs = at({ dhsc: -10 });
    expect(by(nhs, 'public').rating).toBeLessThanOrEqual(3);
    const cuts = rule(nhs, 'public', 'pb-service-cuts');
    expect(cuts?.points).toBe(-2);
    // Health is named as the service cut, in the words kept for the services people use most.
    expect(bandOf(cuts)).toBe('deep (protectedCutsGbpm)');
    expect(cuts?.text).toContain(noun('dhsc'));
    expect(rule(nhs, 'markets', 'mk-deep-cuts')?.points).toBe(-1);
    // Health and schools count from two billion: the walk's half-point trim costs nothing.
    expect(rule(at({ dhsc: -0.5 }), 'public', 'pb-service-cuts')?.points).toBe(0);
    expect(rule(at({ dhsc: -1 }), 'public', 'pb-service-cuts')?.points).toBe(-1);
    // Other services count from three billion.
    expect(rule(at({ home: -10 }), 'public', 'pb-service-cuts')?.points).toBe(0);
    // A cut is a cut even when another budget rises more, and the party hears both sides.
    const mixed = rule(at({ dhsc: 3, moj: -10, home: -10 }), 'backbenchers', 'bb-public-services');
    expect(bandOf(mixed)).toMatch(/ \(serviceCutsGbpm\)$/);
    for (const code of ['moj', 'home']) expect(mixed?.text).toContain(noun(code));
    expect(said(cuts, mixed)).toMatchSnapshot();
  });

  it('keeps benefits out of public services, and hears welfare both ways', () => {
    const welfare: Budget[] = [{ wuc: -5 }, { wuc: 5 }, { rvpip: 1 }, { lha30: 1 }, { csjmh: 1 }];
    for (const policy of welfare) {
      expect(
        rule(at(policy), 'backbenchers', 'bb-public-services')?.points,
        JSON.stringify(policy),
      ).toBe(0);
    }
    expect(rule(at({ csjmh: 1 }), 'backbenchers', 'bb-welfare-cut')?.points).toBe(-2);
    expect(rule(at({ wuc: 5 }), 'backbenchers', 'bb-welfare-cut')?.points).toBe(1);
  });

  it('counts the taxes most households feel, and gives no point either way for taxing the top', () => {
    const banks = at({ bank5: 1, banklevy: 1, qelevy: 1 });
    expect(rule(banks, 'public', 'pb-tax-rises')?.points).toBe(0);
    // Employer National Insurance is felt, as the incidence file says business taxes are felt.
    const employers = rule(at(BIG_BROAD_TAX_RISE), 'public', 'pb-tax-rises');
    expect(employers?.points).toBeLessThan(0);
    expect(employers?.text).toContain(groupOf('nicer')?.felt);
    expect(said(employers)).toMatchSnapshot();
    // A higher-rate rise is the better-off paying, as the benches see it.
    expect(rule(at({ ithr: 2 }), 'backbenchers', 'bb-who-pays')?.points).toBe(1);
  });

  it('floors the public only for the manifesto’s own words; last year’s U-turn costs a point', () => {
    const twoChild = at(TWO_CHILD_LIMIT);
    expect(by(twoChild, 'public').rating).toBeGreaterThan(1);
    expect(rule(twoChild, 'public', 'pb-commitments')?.points).toBe(-1);
    expect(rule(twoChild, 'public', 'pb-manifesto')?.points).toBe(0);
    expect(rule(twoChild, 'public', 'pb-commitments')?.causes).toEqual(causes(TWO_CHILD_LIMIT));
    // The benches still pay for it.
    expect(rule(twoChild, 'backbenchers', 'bb-welfare-reversals')?.points).toBe(-1);
    expect(rule(twoChild, 'backbenchers', 'bb-manifesto')?.points).toBe(0);
    // A defence trim strains a promise and is scored by nobody: the public is not furious.
    const trim = at({ mod: -1 });
    expect(by(trim, 'public').rating).toBeGreaterThan(1);
    expect(rule(trim, 'public', 'pb-manifesto-strain')?.points).toBe(0);
    // The tax lock still floors it.
    expect(by(at(PENNY), 'public').rating).toBe(1);
  });

  it('credits a Budget paid for in every year, and marks borrowing that comes early', () => {
    const paid = rule(at({ ...SECURITY_FLAGSHIPS, ...PENNY }), 'markets', 'mk-paid-for');
    expect(paid?.points).toBe(1);
    for (const cause of causes(PENNY)) expect(paid?.causes).toContain(cause);
    // Nothing moved: nothing to pay for, and no point for it.
    expect(rule(at({}), 'markets', 'mk-paid-for')?.points).toBe(0);
    // Borrowed in some year: no point, and the borrowing says so elsewhere.
    expect(rule(at(THREE), 'markets', 'mk-paid-for')?.points).toBe(0);
    // Defence at 3% now costs most in 2027-28: the target year understates it.
    const front = rule(at(FRONT_LOADED), 'markets', 'mk-front-loaded');
    expect(front?.points).toBe(-1);
    for (const cause of causes(FRONT_LOADED)) expect(front?.causes).toContain(cause);
  });

  it('takes three points to reach either end of the scale; a strain alone is never the floor', () => {
    expect(ratingOf([{ points: -2 }])).toBe(2);
    expect(ratingOf([{ points: -3 }])).toBe(1);
    expect(ratingOf([{ points: 2 }])).toBe(4);
    expect(ratingOf([{ points: 3 }])).toBe(5);
    expect(ratingOf([{ points: 2 }, { points: -1, cap: 3 }])).toBe(3);
    // Partners' National Insurance strains the tax lock and is small: the strain is all there is.
    const strained = at({ nicllp: 1 });
    expect(rule(strained, 'public', 'pb-manifesto-strain')?.points).toBe(-1);
    for (const r of strained) expect(r.rating, r.audience).toBeGreaterThan(1);
  });
});

describe('graded delivery (Phase 25)', () => {
  // One cheap way per priority: a care down-payment, the defence plan's gap, the Plan 2 threshold.
  const TOKEN = { ...NHS_START, ...DEFENCE_GAP, rvplan2: 1 };

  it('a token three-tick rates no better than the funded walk, audience by audience', () => {
    const token = room(TOKEN);
    const walk = room(SECURITY_FLAGSHIPS);
    for (const audience of ['backbenchers', 'markets', 'public'] as const) {
      expect(by(token, audience).rating, audience).toBeLessThanOrEqual(by(walk, audience).rating);
    }
  });
});

describe('three audiences, five steps', () => {
  it('rates each audience one to five, deterministically, with a label from the data', () => {
    const budget = { dhsc: 3, itbr: 1, socrent: 1 };
    const a = room(budget);
    expect(a).toEqual(room(budget));
    expect(a.map((r) => r.audience)).toEqual(['backbenchers', 'markets', 'public']);
    for (const r of a) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
      const audience = ds.reception.audiences.find((x) => x.id === r.audience);
      expect(r.label).toBe(audience?.labels[r.rating - 1]);
      expect(r.reasons.length).toBeLessThanOrEqual(3);
      expect(r.all).toHaveLength(audience?.rules.length ?? -1);
      expect(r.badge).toBe('simulated');
    }
    // An empty Budget: the backbenchers and the public shrug, the markets watch the Chancellor's
    // own modest headroom.
    const base = room({});
    expect(by(base, 'backbenchers').rating).toBe(3);
    expect(by(base, 'public').rating).toBe(3);
    expect(by(base, 'markets').rating).toBe(3);
  });

  it('pins the public at the floor when a manifesto red line is crossed, whatever else happens', () => {
    const lock = by(room({ ...SECURITY_FLAGSHIPS, ...PENNY, fuel: -10 }), 'public');
    expect(lock.rating).toBe(1);
    expect(lock.reasons[0]?.rule).toBe('pb-manifesto');
    expect(bandOf(lock.reasons[0])).toBe('broken');
    // The same Budget paid for without crossing a line stays off the floor.
    const base = by(room({ ...SECURITY_FLAGSHIPS, iht: 10, fuel: -10 }), 'public');
    expect(base.rating).toBeGreaterThan(1);
    expect(said(lock.reasons[0])).toMatchSnapshot();
    // Missing a rule by arithmetic is not a manifesto break: no floor.
    expect(by(room(DAY_TO_DAY_RULE_MISSED), 'public').rating).toBeGreaterThan(1);
  });

  it('marks a strain amber: employer National Insurance alone leaves the public above the floor, with the strain named', () => {
    const budget = { ...SECURITY_FLAGSHIPS, ...EMPLOYER_NICS };
    const pub = by(room(budget), 'public');
    expect(pub.rating).toBeGreaterThan(1);
    expect(pub.all.find((r) => r.rule === 'pb-manifesto')?.points).toBe(0);
    const strain = pub.all.find((r) => r.rule === 'pb-manifesto-strain');
    expect(strain?.points).toBe(-1);
    expect(bandOf(strain)).toBe('strained');
    expect(said(strain)).toMatchSnapshot();
    const benches = by(room(budget), 'backbenchers');
    expect(benches.all.find((r) => r.rule === 'bb-manifesto-strain')?.points).toBe(-1);
    // Paid for by the penny instead: the floor, and the strain rule has nothing to add.
    const penny = by(room({ ...SECURITY_FLAGSHIPS, ...PENNY }), 'public');
    expect(penny.rating).toBe(1);
    expect(penny.all.find((r) => r.rule === 'pb-manifesto-strain')?.points).toBe(0);
  });

  it('warms the backbenchers to services funded from the top, and cools them to cuts', () => {
    const labour = by(room({ dhsc: 5, dfe: 3, ...TAXES_AT_THE_TOP, iht: 10 }), 'backbenchers');
    const austere = by(
      room({ ...HEALTH_CUT, dfe: -5, ...TWO_CHILD_LIMIT, fuel: 10 }),
      'backbenchers',
    );
    expect(labour.rating).toBeGreaterThan(austere.rating);
    expect(labour.rating).toBeGreaterThanOrEqual(4);
    expect(austere.rating).toBeLessThanOrEqual(2);
    // The benches say why: a welfare cut they fought to reverse, and the best-off paying.
    const reversal = austere.reasons.find((r) => r.rule === 'bb-welfare-reversals');
    expect(reversal?.points).toBeLessThan(0);
    const fromTheTop = labour.reasons.find((r) => r.rule === 'bb-who-pays');
    expect(bandOf(fromTheTop)).toBe('top');
    expect(said(reversal, fromTheTop)).toMatchSnapshot();
  });

  it('lowers the markets when headroom is thin or a rule missed, and raises them for a margin', () => {
    const base = by(room({}), 'markets');
    const thin = by(room({ dhsc: 8 }), 'markets');
    const missed = by(room(DAY_TO_DAY_RULE_MISSED), 'markets');
    // A certified saving, not a relief cost: the markets doubt those (Phase 25).
    const ample = by(room(HEALTH_CUT), 'markets');
    expect(thin.rating).toBeLessThan(base.rating);
    expect(missed.rating).toBe(1);
    expect(missed.reasons.some((r) => r.rule === 'mk-headroom' && bandOf(r) === 'missed')).toBe(
      true,
    );
    expect(
      missed.reasons.some((r) => causes(DAY_TO_DAY_RULE_MISSED).every((c) => r.causes.includes(c))),
    ).toBe(true);
    expect(ample.rating).toBeGreaterThanOrEqual(base.rating);
  });

  it('doubts a yield that rests on HMRC’s cost of a relief, and says which kind of figure it is', () => {
    // Employer NICs on pensions is Worked out, but its base is HMRC's cost of a relief.
    const relief = by(room({ nicpen: 1 }), 'markets');
    const doubted = relief.all.find((r) => r.rule === 'mk-credibility');
    expect(doubted?.points).toBe(-1);
    expect(bandOf(doubted)).toBe('doubted (reliefShareOfUncertified)');
    expect(doubted?.causes).toContain(ds.levers.find((l) => l.code === 'nicpen')?.noun);
    // A think tank's figure is doubted in other words.
    const other = by(room({ qelevy: 1 }), 'markets');
    const doubtedOther = other.all.find((r) => r.rule === 'mk-credibility');
    expect(bandOf(doubtedOther)).toBe('doubted');
    expect(said(doubted, doubtedOther)).toMatchSnapshot();
    // HMRC's certified rows raise no doubt.
    const certified = by(room(PENNY), 'markets');
    expect(certified.all.find((r) => r.rule === 'mk-credibility')?.points).toBe(0);
  });

  it('says nothing that is not in the data, and quotes no figure a band cannot source', () => {
    const templates = ds.reception.audiences.flatMap((a) =>
      a.rules.flatMap((r) =>
        r.bands.flatMap((b) => [b.text, ...(b.variants ?? []).map((v) => v.text)]),
      ),
    );
    const matches = (template: string, text: string) => {
      const pattern = template
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(
          /\\\{(value|abs|typicalError|payers|feltHow|protected|protectedCut|cutServices|year)\\\}/g,
          '.+?',
        );
      return new RegExp(`^${pattern}$`).test(text);
    };
    for (const r of room({ itbr: 3, ...DAY_TO_DAY_RULE_MISSED, ...TWO_CHILD_LIMIT })) {
      for (const reason of r.all) {
        expect(
          templates.some((t) => matches(t, reason.text)),
          reason.text,
        ).toBe(true);
      }
    }
    for (const a of ds.reception.audiences) {
      expect(a.labels).toHaveLength(5);
      for (const rule of a.rules) {
        for (const band of rule.bands) {
          expect(band.badge).toBe('simulated');
          const words = band.text.replace(
            /\{(value|abs|typicalError|payers|feltHow|protected|protectedCut|cutServices|year)\}/g,
            '',
          );
          if (FIGURE.test(words)) {
            expect(
              band.sources.length,
              `${rule.id}/${band.id} quotes a figure without a source`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('keeps every rating in one to five, however the points and caps fall', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            points: fc.integer({ min: -3, max: 3 }),
            cap: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          }),
          { maxLength: 8 },
        ),
        (reasons) => {
          const rating = ratingOf(reasons);
          expect(rating).toBeGreaterThanOrEqual(1);
          expect(rating).toBeLessThanOrEqual(5);
          for (const r of reasons)
            if (r.cap !== undefined) expect(rating).toBeLessThanOrEqual(r.cap);
        },
      ),
    );
    // And over real packages: the levers the moves touch, at random settings.
    const codes = [...new Set(MOVES.flatMap((move) => Object.keys(move)))];
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -2, max: 2 }), {
          minLength: codes.length,
          maxLength: codes.length,
        }),
        (v) => {
          const values: Record<string, number> = {};
          codes.forEach((code, i) => {
            const lever = ds.levers.find((l) => l.code === code);
            if (!lever) return;
            const n = v[i] ?? 0;
            const value = Math.max(
              lever.control.min,
              Math.min(lever.control.max, n * lever.control.step * 2),
            );
            if (value !== lever.control.default) values[code] = value;
          });
          for (const r of room(values)) {
            expect(r.rating).toBeGreaterThanOrEqual(1);
            expect(r.rating).toBeLessThanOrEqual(5);
          }
        },
      ),
      { numRuns: 12 },
    );
  });
});
