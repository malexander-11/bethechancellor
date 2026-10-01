import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  computeOutcome,
  formatGbpBn,
  isMissed,
  macroCodesOf,
  missedBy,
} from '../src/index.js';
import { loadDataset, outcomeOfFor, wording } from './fixtures.js';
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
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const ESTIMATE = todaysEstimate(ds);
const MACRO = macroCodesOf(latestContext(ds).readings);
const outcomeOf = outcomeOfFor(ds);

/**
 * The review's seven Budgets (Phase 25, R3): the walk, the walk paid by employer National
 * Insurance, a 2p cut to the basic rate, doing nothing, a priority left unfunded, a 5% cut to
 * health, and investment that misses the debt rule alone. On each, no speech figure may say the
 * opposite of the sums: the rules result, a priority's fate or the sign of a change.
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
  return { game, outcome, status, speech, pre };
}

describe('Budget day agrees with the sums, on the review’s seven Budgets (Phase 25)', () => {
  it.each(BUDGETS)('%s', (_name, priorities, policy) => {
    const { outcome, status, speech, pre } = deliver(priorities, policy);
    const year = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
    const said = speech.paragraphs.map((p) => p.text).join(' ');

    // The rules result: one test, said the same way everywhere.
    const missed = outcome.verdicts.filter(isMissed);
    if (missed.length > 0) {
      for (const v of missed) {
        expect(said).toContain(missedBy(v));
        expect(speech.paragraphs.at(-1)?.figures).toContain(
          formatGbpBn(Math.abs(v.headroomGbpm), 1),
        );
      }
      expect(said).not.toMatch(/meets the fiscal rules/);
    } else {
      expect(said).toMatch(/this Budget meets the fiscal rules/);
      expect(said).not.toMatch(/misses/);
    }
    // The speech never passes today's estimate off as the OBR's confirmation.
    expect(said).not.toMatch(/confirms/);

    // The speech claims only what was funded.
    const first = status.priorities.find((p) => p.status === 'delivered');
    for (const p of status.priorities) {
      if (p.status === 'notFunded') expect(said).not.toContain(`${p.priority.title}:`);
    }
    const opening = speech.paragraphs[0]?.text ?? '';
    expect(opening).toBe(
      (first ? ds.speech.opening[first.priority.id] : ds.speech.opening.default)?.text,
    );

    // The sign of the change in borrowing.
    const borrowingChange =
      (outcome.paths.policy.psnb[year] ?? 0) - (pre.paths.policy.psnb[year] ?? 0);
    const forecast = speech.paragraphs.find((p) => p.kind === 'forecast')?.text ?? '';
    if (borrowingChange >= 50) expect(forecast).toMatch(/This Budget adds/);
    else if (borrowingChange <= -50) expect(forecast).toMatch(/This Budget cuts borrowing/);
    else expect(forecast).toMatch(/about where it was/);
    // Every figure in the speech is one the engine produced.
    const figures = new Set(speech.paragraphs.flatMap((p) => p.figures));
    for (const match of said.match(/£\d[\d,]*\.?\d*bn/g) ?? [])
      expect(figures.has(match)).toBe(true);
  });

  it('reads as the review said each should', () => {
    // The walk breaks the tax lock.
    const walk = deliver(SECURITY, WALK);
    const broken = walk.status.promises.filter(
      (p) => !p.kept && p.promise.judgedBy !== 'fiscalRules',
    );
    expect(broken.map((p) => p.promise.id)).toEqual(['tax-lock']);
    // Investment misses the debt rule alone, and the speech says so by its own margin.
    const debt = deliver(['defence'], DEBT_RULE_MISSED);
    const missed = debt.outcome.verdicts.filter(isMissed);
    expect(missed.map((v) => v.kind)).toEqual(['stockFalling']);
    expect(debt.speech.paragraphs.at(-1)?.text).toContain(missed[0] && missedBy(missed[0]));
    // The words as the review read them: a rewording is an updated snapshot and a reviewed diff.
    expect(wording(debt.speech.paragraphs.at(-1)?.text)).toMatchSnapshot();
  });
});
