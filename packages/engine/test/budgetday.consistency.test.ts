import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  budgetVerdict,
  computeOutcome,
  formatGbpBn,
  isMissed,
  macroCodesOf,
  missedBy,
  readings,
  statementOf,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  DEBT_RULE_MISSED,
  HEALTH_CUT,
  NICS_WALK,
  PRISONS,
  SECURITY,
  WALK,
  gameWith,
  latestContext,
  todaysEstimate,
  typicalError,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const ESTIMATE = todaysEstimate(ds);
const MACRO = macroCodesOf(latestContext(ds).readings);
const outcomeOf = outcomeOfFor(ds);
const typicalErrorGbpm = typicalError(ds);

/**
 * The review's seven Budgets (Phase 25, R3): the walk, the walk paid by employer National
 * Insurance, a 2p cut to the basic rate, doing nothing, a priority left unfunded, a 5% cut to
 * health, and investment that misses the debt rule alone. On each, no sentence, no close and no
 * speech figure may say the opposite of the sums: the rules result, a priority's fate or the sign
 * of a change.
 */
const BUDGETS: [string, readonly string[], Budget][] = [
  ['the walk', SECURITY, WALK],
  ['the employer NICs walk', SECURITY, NICS_WALK],
  ['a 2p basic-rate cut', SECURITY, BASIC_RATE_CUT],
  ['doing nothing', SECURITY, {}],
  ['an unfunded priority', SECURITY, PRISONS],
  ['a 5% cut to health', ['nhs'], HEALTH_CUT],
  ['investment past the debt rule', ['defence'], DEBT_RULE_MISSED],
];

function deliver(priorities: readonly string[], policy: Budget) {
  const game = gameWith(priorities);
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: { ...policy, ...ESTIMATE } },
  });
  const status = ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers);
  const r = readings({
    outcome,
    levers: ds.levers,
    typicalErrorGbpm,
    outcomeOf,
    game,
    status,
    incidence: ds.incidence,
  });
  const verdict = budgetVerdict({
    levers: ds.levers,
    pm: ds.pm,
    options: ds.options,
    incidence: ds.incidence,
    kinds: ds.verdicts,
    game,
    outcome,
    typicalErrorGbpm,
    credibilityShare: r.credibilityShare ?? 0,
    rebellionRisk: r.rebellionRisk ?? 0,
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
  const speech = assembleSpeech({
    speech: ds.speech,
    outcome,
    levers: ds.levers,
    game,
    pm: ds.pm,
    status,
    macroCodes: MACRO,
    outcomeOf,
  });
  const pre = outcomeOf(Object.fromEntries(MACRO.map((c) => [c, ESTIMATE[c] ?? 0])));
  return { game, outcome, status, verdict, statement, speech, pre };
}

describe('Budget day agrees with the sums, on the review’s seven Budgets (Phase 25)', () => {
  it.each(BUDGETS)('%s', (_name, priorities, policy) => {
    const { outcome, status, verdict, statement, speech, pre } = deliver(priorities, policy);
    const year = verdict.targetYear;
    const all = [statement.prioritised, statement.paid, statement.accepted].join(' ');
    const said = speech.paragraphs.map((p) => p.text).join(' ');

    // The rules result: one test, said the same way everywhere.
    const missed = outcome.verdicts.filter(isMissed);
    const fiscalMissed = missed.some((v) => v.kind !== 'welfareCap');
    if (missed.length > 0) {
      expect(statement.accepted).toBe(`I accepted missing ${inWords(missed.map(missedBy))}.`);
      expect(verdict.kind.id).toBe('rules-missed');
      for (const v of missed) {
        expect(said).toContain(missedBy(v));
        expect(speech.paragraphs.at(-1)?.figures).toContain(
          formatGbpBn(Math.abs(v.headroomGbpm), 1),
        );
      }
      expect(said).not.toMatch(/meets the fiscal rules/);
    } else {
      expect(statement.accepted).not.toMatch(/missing/);
      expect(verdict.kind.id).not.toBe('rules-missed');
      expect(said).toMatch(/this Budget meets the fiscal rules/);
      expect(said).not.toMatch(/misses/);
    }
    // Borrowing past the rules is said as borrowing, and the headroom is never said to pay for it.
    expect(statement.paid.includes('borrowing more than the rules allow')).toBe(fiscalMissed);
    if (fiscalMissed) expect(statement.paid).not.toMatch(/headroom I had/);
    // The speech never passes today's estimate off as the OBR's confirmation.
    expect(said).not.toMatch(/confirms/);

    // Each priority's fate, in the words that fit it, and the speech claims only what was funded.
    const first = status.priorities.find((p) => p.status === 'delivered');
    const clauses = statement.prioritised
      .replace(/^I /, '')
      .replace(/\.$/, '')
      .split(/, and |, (?=made a start|named)/);
    const VERB = {
      delivered: 'prioritised',
      started: 'made a start on',
      settledLower: 'made a start on',
      notFunded: 'named',
    };
    for (const p of status.priorities) {
      const clause = clauses.find((c) => c.includes(p.priority.noun)) ?? '';
      expect(clause.startsWith(VERB[p.status]), `${p.priority.id}: "${clause}"`).toBe(true);
      if (p.status === 'notFunded') {
        expect(clause).toMatch(/but put nothing behind/);
        expect(said).not.toContain(`${p.priority.title}:`);
      }
    }
    const opening = speech.paragraphs[0]?.text ?? '';
    expect(opening).toBe(
      (first ? ds.speech.opening[first.priority.id] : ds.speech.opening.default)?.text,
    );

    // The sign of every change: borrowing, taxes and spending.
    const borrowingChange =
      (outcome.paths.policy.psnb[year] ?? 0) - (pre.paths.policy.psnb[year] ?? 0);
    const forecast = speech.paragraphs.find((p) => p.kind === 'forecast')?.text ?? '';
    if (borrowingChange >= 50) expect(forecast).toMatch(/This Budget adds/);
    else if (borrowingChange <= -50) expect(forecast).toMatch(/This Budget cuts borrowing/);
    else expect(forecast).toMatch(/about where it was/);
    const raised = verdict.paid.some((r) => r.gbpm >= 100);
    const cut = verdict.paid.some((r) => r.gbpm <= -100);
    const less = verdict.benefited.some((r) => r.gbpm <= -100);
    expect(/to pay more/.test(statement.paid)).toBe(raised);
    expect(/cut taxes/.test(statement.paid)).toBe(cut);
    expect(/less to/.test(statement.paid)).toBe(less);
    if (verdict.kind.id === 'paid-by-cuts') expect(less).toBe(true);
    // A thin margin is the markets' line: under ten billion, in the statement and the close alike.
    if (/thin margin/.test(all)) expect(verdict.headroomGbpm).toBeLessThan(10_000);
    if (verdict.kind.id === 'kept-everything-thin')
      expect(verdict.headroomGbpm).toBeLessThan(10_000);
    // Every figure in the speech is one the engine produced.
    const figures = new Set(speech.paragraphs.flatMap((p) => p.figures));
    for (const match of said.match(/£\d[\d,]*\.?\d*bn/g) ?? [])
      expect(figures.has(match)).toBe(true);
  });

  it('reads as the review said each should', () => {
    const walk = deliver(SECURITY, WALK);
    expect(walk.verdict.kind.id).toBe('broke-for-buffer');
    expect(walk.statement.accepted).toBe('I accepted breaking the tax lock.');
    const employer = deliver(SECURITY, NICS_WALK);
    expect(employer.verdict.kind.id).toBe('delivered-and-paid');
    const cut = deliver(SECURITY, BASIC_RATE_CUT);
    expect(cut.statement.paid).toMatch(/^I cut taxes for everyone who earns or spends/);
    const nothing = deliver(SECURITY, {});
    expect(nothing.statement.paid).toBe('I changed no taxes and no spending.');
    expect(nothing.verdict.kind.id).toBe('left-out-with-room');
    const health = deliver(['nhs'], HEALTH_CUT);
    expect(health.verdict.kind.id).toBe('paid-by-cuts');
    const debt = deliver(['defence'], DEBT_RULE_MISSED);
    expect(debt.speech.paragraphs.at(-1)?.text).toMatch(/misses the debt rule by £18\.8bn\./);
  });
});

function inWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
