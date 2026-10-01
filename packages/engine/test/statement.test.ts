import { describe, expect, it } from 'vitest';
import {
  THIN_HEADROOM_GBPM,
  ambitionStatus,
  budgetVerdict,
  computeOutcome,
  formatGbpBn,
  isMissed,
  missedBy,
  statementOf,
  type IncidenceRow,
  type PriorityStatus,
} from '../src/index.js';
import { loadDataset, outcomeOfFor, wording } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  CORPORATION_TAX_RISE,
  DEBT_RULE_MISSED,
  EMPLOYER_NICS,
  ESTATES_AND_HOMES_PAY,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  INVESTMENT_WITHIN_RULES,
  NHS_START,
  PRISONS,
  SECURITY,
  SECURITY_FLAGSHIPS,
  TWO_CHILD_LIMIT,
  gameWith,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
/** Today's estimate: every game is played on it (Phase 24). */
const ESTIMATE = todaysEstimate(ds);
const outcomeOf = outcomeOfFor(ds);
const typicalErrorGbpm = typicalError(ds);

/** A Budget delivered on today's estimate: its figures, the close, and its three sentences. */
function close(priorities: readonly string[], policy: Budget) {
  const game = gameWith(priorities);
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE } },
  });
  const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
  const verdict = budgetVerdict({
    levers: ds.levers,
    pm: ds.pm,
    options: ds.options,
    incidence: ds.incidence,
    kinds: ds.verdicts,
    game,
    outcome,
    typicalErrorGbpm,
    credibilityShare: 0,
    rebellionRisk: 0,
    outcomeOf,
  });
  const statement = statementOf({
    game,
    pm: ds.pm,
    outcome,
    verdict,
    status,
    levers: ds.levers,
    outcomeOf,
  });
  return { outcome, status, verdict, statement };
}

const budget = (priorities: readonly string[], policy: Budget) => ({ priorities, policy });
/** The Budgets the statement is read on, each named for the part it plays. */
const CASES = {
  'no priorities, nothing changed': budget([], {}),
  'defence and safer streets delivered': budget(SECURITY, SECURITY_FLAGSHIPS),
  'safer streets delivered, defence left': budget(SECURITY, PRISONS),
  'defence and safer streets left': budget(SECURITY, {}),
  'a start on the NHS': budget(['nhs'], NHS_START),
  'the welfare bill down': budget(['welfare-bill'], { rvpip: 1 }),
  'a basic-rate cut past the rules': budget(['defence'], BASIC_RATE_CUT),
  'prisons out of the headroom': budget(['safer-streets'], PRISONS),
  'three priorities borrowed past the rules': budget(['nhs', ...SECURITY], {
    ...HEALTH_ABOVE_PLAN,
    ...SECURITY_FLAGSHIPS,
  }),
  'prisons paid for by estates and home buyers': budget(['safer-streets'], {
    ...PRISONS,
    ...ESTATES_AND_HOMES_PAY,
  }),
  'a health cut': budget(['nhs'], HEALTH_CUT),
  'a corporation tax rise': budget([], CORPORATION_TAX_RISE),
  'investment within the rules': budget([], INVESTMENT_WITHIN_RULES),
  'the debt rule missed': budget(['defence'], DEBT_RULE_MISSED),
  'the two-child limit back': budget([], TWO_CHILD_LIMIT),
  'employer National Insurance': budget([], EMPLOYER_NICS),
  'a small health trim': budget([], { dhsc: -1 }),
};
type Case = keyof typeof CASES;
const cases = Object.keys(CASES) as Case[];
const closed = new Map<Case, ReturnType<typeof close>>();
/** A named Budget, closed once. */
function read(name: Case) {
  const hit = closed.get(name);
  if (hit) return hit;
  const done = close(CASES[name].priorities, CASES[name].policy);
  closed.set(name, done);
  return done;
}

/** A priority's name in running words, as the Prime Minister's file gives it. */
const noun = (id: string) => ds.pm.priorities.find((p) => p.id === id)?.noun ?? id;
/** A sentence with the priorities' names taken out, so two sentences can be compared by shape. */
const shape = (text: string) =>
  ds.pm.priorities
    .map((p) => p.noun)
    .sort((a, b) => b.length - a.length)
    .reduce((t, n) => t.replaceAll(n, '{priority}'), text);

describe('your Budget, in three sentences (Phase 25)', () => {
  it('reads as recorded; a rewording is an updated snapshot and a reviewed diff', () => {
    const said = Object.fromEntries(
      cases.map((name) => {
        const { prioritised, paid, accepted } = read(name).statement;
        return [name, [prioritised, paid, accepted].map(wording)];
      }),
    );
    expect(said).toMatchSnapshot();
  });

  it('names each priority it was given, delivered first, then started, then left, and no other', () => {
    const order: Record<PriorityStatus, number> = {
      delivered: 0,
      started: 1,
      settledLower: 1,
      notFunded: 2,
    };
    for (const name of cases) {
      const { priorities } = CASES[name];
      const { status, statement } = read(name);
      const fate = (id: string) =>
        status.priorities.find((p) => p.priority.id === id)?.status ?? 'notFunded';
      const at = [...priorities]
        .sort((a, b) => order[fate(a)] - order[fate(b)])
        .map((id) => statement.prioritised.indexOf(noun(id)));
      expect(
        at.every((i) => i >= 0),
        name,
      ).toBe(true);
      expect(at, name).toEqual([...at].sort((a, b) => a - b));
      for (const p of ds.pm.priorities.filter((p) => !priorities.includes(p.id))) {
        expect(statement.prioritised, name).not.toContain(p.noun);
      }
    }
  });

  it('says each priority the way its fate is said: delivered, started, or named and left', () => {
    const fateOf = (c: ReturnType<typeof close>) => c.status.priorities.map((p) => p.status);
    const said = (c: ReturnType<typeof close>) => shape(c.statement.prioritised);
    const delivered = close(['safer-streets'], PRISONS);
    const started = read('a start on the NHS');
    const left = close(['defence'], {});
    expect([delivered, started, left].map(fateOf)).toEqual([
      ['delivered'],
      ['started'],
      ['notFunded'],
    ]);
    expect(new Set([delivered, started, left].map(said)).size).toBe(3);
    // Any priority delivered is said the same way.
    expect(fateOf(read('the welfare bill down'))).toEqual(['delivered']);
    expect(said(read('the welfare bill down'))).toBe(said(delivered));
    // Delivered and left in one Budget: each is said its own way, what was delivered first, so an
    // unfunded priority is named as one, never as prioritised.
    const clause = (c: ReturnType<typeof close>) => said(c).replace(/^I /, '').replace(/\.$/, '');
    const both = said(read('safer streets delivered, defence left'));
    expect(both).toContain(clause(delivered));
    expect(both).toContain(clause(left));
    expect(both.indexOf(clause(delivered))).toBeLessThan(both.indexOf(clause(left)));
    expect(said(read('defence and safer streets left'))).not.toBe(
      said(read('defence and safer streets delivered')),
    );
  });

  it('says where the money came from, borrowing included, and never says the opposite', () => {
    /** The biggest group on one side of the close's table, when it is big enough to name. */
    const biggest = (rows: readonly IncidenceRow[], sign: 1 | -1) => {
      const row = rows.find((r) => Math.sign(r.gbpm) === sign);
      return row && Math.abs(row.gbpm) >= 1000 ? [row.label.toLowerCase()] : [];
    };
    for (const name of cases) {
      const { outcome, verdict, statement } = read(name);
      const missed = outcome.verdicts.some(
        (v) => (v.kind === 'currentBudget' || v.kind === 'stockFalling') && isMissed(v),
      );
      if (missed) {
        // Past the rules is borrowing, and said so: never "out of the headroom".
        expect(statement.paid, name).toMatch(/borrow/);
        expect(statement.paid, name).not.toMatch(/headroom/);
      } else {
        expect(statement.paid, name).not.toMatch(/rules/);
      }
      // Who paid more, who had a tax cut and who got less, by the close's own groups.
      for (const group of [
        ...biggest(verdict.paid, 1),
        ...biggest(verdict.paid, -1),
        ...biggest(verdict.benefited, -1),
      ]) {
        expect(statement.paid.toLowerCase(), name).toContain(group);
      }
    }
    // Inside the rules, a priority paid for out of the headroom says so.
    expect(read('prisons out of the headroom').statement.paid).toMatch(/headroom/);
    // Investment inside the rules is borrowing to invest, not a raid on the headroom.
    const investment = read('investment within the rules').statement.paid;
    expect(investment).toMatch(/borrow/);
    expect(investment).not.toMatch(/headroom/);
    expect(read('no priorities, nothing changed').statement.paid).not.toMatch(/borrow|headroom/);
  });

  it('says what was accepted, the gravest first: a missed rule, a broken promise, a strain, a thin margin', () => {
    for (const name of cases) {
      const { outcome, status, verdict, statement } = read(name);
      const missed = outcome.verdicts.filter(isMissed);
      const broken = status.promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
      const strained = status.strains.filter((s) => s.strained);
      // A rule by its own name and margin; a promise by its name in running words, not its title.
      const said =
        missed.length > 0
          ? missed.map(missedBy)
          : broken.length > 0
            ? broken.map((p) => p.promise.noun)
            : strained.length > 0
              ? strained.map((s) => s.promise.noun)
              : [formatGbpBn(verdict.headroomGbpm, 1)];
      for (const words of said) expect(statement.accepted, name).toContain(words);
      for (const p of broken) expect(statement.accepted, name).not.toContain(p.promise.title);
    }
    expect(read('the debt rule missed').outcome.verdicts.some(isMissed)).toBe(true);
    // A strain nobody scores is still said, and not as one that is scored: put at risk.
    const promiseOf = (name: Case) =>
      read(name).status.strains.find((s) => s.strained)?.promise.noun ?? '';
    const asStrain = (name: Case) =>
      read(name).statement.accepted.replace(promiseOf(name), '{promise}');
    expect(promiseOf('employer National Insurance')).not.toBe('');
    expect(promiseOf('a small health trim')).not.toBe('');
    expect(asStrain('a small health trim')).not.toBe(asStrain('employer National Insurance'));
    // A thin margin is called thin, under the markets' line; above it, every promise was kept.
    const thin = read('prisons out of the headroom');
    const kept = read('prisons paid for by estates and home buyers');
    expect(thin.verdict.headroomGbpm).toBeLessThan(THIN_HEADROOM_GBPM);
    expect(kept.verdict.headroomGbpm).toBeGreaterThanOrEqual(THIN_HEADROOM_GBPM);
    expect(wording(thin.statement.accepted)).not.toBe(wording(kept.statement.accepted));
  });
});
