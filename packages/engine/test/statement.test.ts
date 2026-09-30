import { describe, expect, it } from 'vitest';
import { ambitionStatus, budgetVerdict, computeOutcome, statementOf } from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  BASIC_RATE_CUT,
  CORPORATION_TAX_RISE,
  DEBT_RULE_MISSED,
  EMPLOYER_NICS,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  HIGHER_EARNERS_PAY,
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

/** The three sentences of a Budget delivered on today's estimate. */
function say(priorities: readonly string[], policy: Budget) {
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
  return statementOf({ game, pm: ds.pm, outcome, verdict, status, levers: ds.levers, outcomeOf });
}

describe('your Budget, in three sentences (Phase 25)', () => {
  it('says what was delivered, what was only started and what was named and left', () => {
    expect(say([], {}).prioritised).toBe('I set no priorities with the Prime Minister.');
    expect(say(SECURITY, SECURITY_FLAGSHIPS).prioritised).toBe(
      'I prioritised defence and safer streets.',
    );
    // An unfunded priority is named as one, never as prioritised.
    expect(say(SECURITY, PRISONS).prioritised).toBe(
      'I prioritised safer streets, and named defence a priority but put nothing behind it.',
    );
    expect(say(SECURITY, {}).prioritised).toBe(
      'I named defence and safer streets priorities but put nothing behind them.',
    );
    // A way that only makes a start is a start.
    expect(say(['nhs'], NHS_START).prioritised).toBe('I made a start on the NHS.');
    expect(say(['welfare-bill'], { rvpip: 1 }).prioritised).toBe(
      'I prioritised getting the welfare bill down.',
    );
  });

  it('says where the money came from, borrowing included, and never says the opposite', () => {
    // A tax cut past the rules: borrowed, and said so.
    expect(say(['defence'], BASIC_RATE_CUT).paid).toBe(
      'I cut taxes for everyone who earns or spends, and paid for it by borrowing more than the rules allow.',
    );
    // A priority paid for out of the headroom, the rules still met.
    expect(say(['safer-streets'], PRISONS).paid).toBe('I paid for it out of the headroom I had.');
    // The same priority borrowed past the rules is never "out of the headroom".
    expect(say(['nhs', ...SECURITY], { ...HEALTH_ABOVE_PLAN, ...SECURITY_FLAGSHIPS }).paid).toBe(
      'I paid for it by borrowing more than the rules allow.',
    );
    // Paid for by taxes, with more raised than spent.
    expect(say(['safer-streets'], { ...PRISONS, ...HIGHER_EARNERS_PAY }).paid).toBe(
      'I paid for it by asking higher earners to pay more, and kept the rest as headroom.',
    );
    // Cuts are said as cuts, with who gets less; nothing to pay for, so the money is kept.
    expect(say(['nhs'], HEALTH_CUT).paid).toBe(
      'I gave less to patients and the NHS, and kept the money as headroom.',
    );
    expect(say([], CORPORATION_TAX_RISE).paid).toBe(
      'I asked business to pay more, and kept the money as headroom.',
    );
    // Investment inside the rules is borrowing to invest, not a raid on the headroom.
    expect(say([], INVESTMENT_WITHIN_RULES).paid).toBe(
      'I spent more on public investment, and paid for it by borrowing to invest.',
    );
    expect(say([], {}).paid).toBe('I changed no taxes and no spending.');
  });

  it('says what was accepted: a missed rule, a broken promise, a strain, a thin margin', () => {
    expect(say(['defence'], DEBT_RULE_MISSED).accepted).toMatch(
      /^I accepted missing the debt rule by £\d+\.\dbn\.$/,
    );
    // Promises by their names in running words, not their titles' statements.
    expect(say([], TWO_CHILD_LIMIT).accepted).toBe(
      'I accepted breaking the promise on the two-child limit.',
    );
    expect(say([], EMPLOYER_NICS).accepted).toBe('I accepted straining the tax lock.');
    // A strain nobody scores is still said: the promise was put at risk.
    expect(say([], { dhsc: -1 }).accepted).toBe(
      'I accepted putting the 18-week waiting target at risk.',
    );
    expect(say(['safer-streets'], PRISONS).accepted).toMatch(
      /^I accepted a thin margin: £\d\.\dbn of headroom\.$/,
    );
    expect(say(['safer-streets'], { ...PRISONS, ...HIGHER_EARNERS_PAY }).accepted).toMatch(
      /^I kept every promise and £\d+\.\dbn of headroom\.$/,
    );
  });
});
