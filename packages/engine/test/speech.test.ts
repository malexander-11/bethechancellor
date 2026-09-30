import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  computeOutcome,
  formatGbpBn,
  freshGame,
  macroCodesOf,
  type GamePermalink,
} from '../src/index.js';
import { loadDataset, outcomeOfFor } from './fixtures.js';
import {
  CORPORATION_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  DEBT_RULE_MISSED,
  DEFENCE_GAP,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
  HIGHER_EARNERS_PAY,
  INVESTMENT_WITHIN_RULES,
  NHS_START,
  PENNY,
  PRISONS,
  SECURITY,
  gameWith,
  latestContext,
  type Budget,
} from './scenarios.js';

const ds = loadDataset();
const MACRO = macroCodesOf(latestContext(ds).readings);
const outcomeOf = outcomeOfFor(ds, { implementationYear: '2027-28' });

function speak(values: Budget, game?: GamePermalink) {
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values, implementationYear: '2027-28' },
  });
  return assembleSpeech({
    speech: ds.speech,
    outcome,
    levers: ds.levers,
    ...(game ? { game, status: ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) } : {}),
    pm: ds.pm,
    macroCodes: MACRO,
    outcomeOf,
  });
}

describe('the speech', () => {
  it('is deterministic, stays inside its word budget, and repeats no fragment', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['nhs', 'schools-send'] };
    const values = {
      dhsc: 3,
      dfe: 5,
      mhclg: 5,
      ufsm: 1,
      itbr: 1,
      ct: 1,
      pens20: 1,
      fuel: -5,
      mod: -2,
    };
    const a = speak(values, game);
    const b = speak(values, game);
    expect(a).toEqual(b);
    expect(a.words).toBeLessThanOrEqual(300);
    const texts = a.paragraphs.map((p) => p.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(a.paragraphs.every((p) => p.badge === 'simulated')).toBe(true);
  });

  it('quotes only figures the engine produced, formatted as the scorecard formats them', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['safer-streets'] };
    const s = speak({ ...PRISONS, itbr: 2, vats: 1 }, game);
    const figures = new Set(s.paragraphs.flatMap((p) => p.figures));
    for (const p of s.paragraphs) {
      for (const match of p.text.match(/[+−-]?£\d[\d,]*\.?\d*bn/g) ?? []) {
        expect(figures.has(match), `"${match}" is not an engine figure`).toBe(true);
      }
    }
    expect(figures.size).toBeGreaterThan(0);
  });

  it('follows the choices: the priority, its options, who pays and a broken promise', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['cost-of-living'] };
    const s = speak({ ufsm: 1, bus2: 1, alc: -5, ct: 1, it50: 1 }, game);
    const kinds = s.paragraphs.map((p) => p.kind);
    expect(kinds[0]).toBe('opening');
    expect(s.paragraphs[0]?.text).toMatch(/cost of living/);
    const priority = s.paragraphs.filter((p) => p.kind === 'priority');
    expect(priority).toHaveLength(1);
    expect(priority[0]?.text).toMatch(
      /free school meals for every child and keep the £2 bus fare cap running/,
    );
    expect(
      s.paragraphs.some((p) => p.kind === 'revenue' && /broadest shoulders/.test(p.text)),
    ).toBe(true);
    expect(
      s.paragraphs.some((p) => p.kind === 'revenue' && /Business will contribute/.test(p.text)),
    ).toBe(true);
    expect(s.paragraphs.find((p) => p.kind === 'giveaways')?.text).toMatch(/alcohol/i);
    // A broken promise is named in running words (Phase 25), never by its title's statement.
    expect(s.paragraphs.find((p) => p.kind === 'lock-break')?.text).toMatch(
      /made: the corporation tax cap\./,
    );
    expect(kinds[kinds.length - 1]).toBe('peroration');
  });

  it('opens on the first priority delivered, a start as a start, and the estimate otherwise', () => {
    const s = speak(DEFENCE_GAP, gameWith(['defence', 'cost-of-living']));
    expect(s.paragraphs[0]?.kind).toBe('opening');
    expect(s.paragraphs[0]?.text).toMatch(/security of its people/);
    // Defence ranked first and left unfunded: the speech opens on what it did fund (Phase 25).
    const second = gameWith(SECURITY);
    const prisons = speak(PRISONS, second);
    expect(prisons.paragraphs[0]?.text).toMatch(/safety of its people: prisons that hold/);
    expect(prisons.paragraphs[0]?.text).not.toMatch(/security/);
    // A priority only started is said as a start, not as a priority delivered.
    const started = speak(NHS_START, gameWith(['nhs']));
    expect(started.paragraphs[0]?.text).toMatch(/makes a start on the NHS\. It does not finish/);
    expect(started.paragraphs.some((p) => p.kind === 'priority')).toBe(false);
    // Nothing funded, or no game: the opening names what the Budget is built on, the March
    // forecast brought up to date, never a forecast that arrived later.
    const nothing = speak({}, second);
    expect(nothing.paragraphs[0]?.text).toMatch(/brought up to date/);
    const sandbox = speak(PENNY);
    expect(sandbox.paragraphs[0]?.text).toMatch(/brought up to date/);
    expect(sandbox.paragraphs[0]?.text).not.toMatch(/this morning/);
  });

  it('owns the forecast: borrowing before any measure, then what the Budget does to it', () => {
    const cut = speak(PENNY);
    const forecast = cut.paragraphs.find((p) => p.kind === 'forecast');
    expect(cut.paragraphs[1]).toBe(forecast);
    // The Budget is delivered in 2026-27, the year before its measures start.
    expect(forecast?.text).toMatch(
      /^On today’s estimate, before any measure in this Budget, we borrow £\d+\.\dbn in 2026-27 and £\d+\.\dbn in 2029-30\. This Budget cuts borrowing in 2029-30 by £\d+\.\dbn\.$/,
    );
    expect(forecast?.figures).toHaveLength(3);
    expect(speak(HEALTH_ABOVE_PLAN).paragraphs[1]?.text).toMatch(
      /This Budget adds £\d+\.\dbn to borrowing/,
    );
    expect(speak({}).paragraphs[1]?.text).toMatch(/leaves borrowing in 2029-30 about where it was/);
  });

  it('owns a missed rule by its own name and margin, and says so plainly when every rule is met', () => {
    const missed = speak(DAY_TO_DAY_RULE_MISSED, freshGame());
    expect(missed.paragraphs.at(-1)?.text).toMatch(
      /^On today’s estimate, this Budget misses the day-to-day rule by £\d+\.\dbn/,
    );
    // Investment misses the debt rule alone: the speech names that rule and its own margin, not
    // the day-to-day rule's (Phase 25).
    const outcome = computeOutcome({
      vintage: ds.vintage,
      rules: ds.rules,
      levers: ds.levers,
      settings: { leverValues: DEBT_RULE_MISSED, implementationYear: '2027-28' },
    });
    const debt = outcome.verdicts.find((v) => v.kind === 'stockFalling');
    expect(debt?.status).toBe('notMet');
    expect(outcome.verdicts.find((v) => v.kind === 'currentBudget')?.status).toBe('met');
    const investment = speak(DEBT_RULE_MISSED);
    const last = investment.paragraphs.at(-1);
    expect(last?.text).toMatch(/misses the debt rule by £\d+\.\dbn\./);
    expect(last?.text).not.toMatch(/day-to-day/);
    expect(last?.figures).toEqual([formatGbpBn(Math.abs(debt?.headroomGbpm ?? 0), 1)]);
    const met = speak(PENNY);
    expect(met.paragraphs.at(-1)?.text).toMatch(
      /^On today’s estimate, this Budget meets the fiscal rules, with £\d+\.\dbn of headroom in 2029-30\. The Office for Budget Responsibility publishes its own verdict today\./,
    );
    // The game's estimate is never passed off as the OBR's confirmation.
    for (const s of [missed, investment, met]) {
      expect(s.paragraphs.some((p) => /confirms/.test(p.text))).toBe(false);
    }
    // Phase 24 retired the add-on flourish, the compromises and the delays: none is ever said.
    for (const s of [missed, met]) {
      for (const p of s.paragraphs) {
        expect(['rabbit', 'compromises', 'delay']).not.toContain(p.kind);
      }
    }
  });

  it('names measures in running words, and says benefits apart from departments', () => {
    const s = speak({ dhsc: -2, rvpip: 1, wuc: -3, alc: -5 });
    expect(s.paragraphs.find((p) => p.kind === 'cuts')?.text).toBe(
      'Some budgets will get less than planned: the health budget.',
    );
    expect(s.paragraphs.find((p) => p.kind === 'welfare-cuts')?.text).toMatch(
      /^We will save on benefits: (the 2025 PIP cuts and universal credit|universal credit and the 2025 PIP cuts)\./,
    );
    expect(s.paragraphs.find((p) => p.kind === 'giveaways')?.text).toMatch(/alcohol/);
    // No lever's short title leaks into a list: the old "will do more with less" is gone.
    expect(s.paragraphs.some((p) => /do more with less/.test(p.text))).toBe(false);
  });

  it('lets the Leader of the Opposition reply, on the Budget’s biggest weakness, with no figure', () => {
    const game = gameWith(['safer-streets']);
    const cases: [Budget, string][] = [
      [DAY_TO_DAY_RULE_MISSED, 'rulesMissed'],
      [{ ...PRISONS, ...CORPORATION_TAX_RISE }, 'promiseBroken'],
      [{ ...PRISONS, ...HIGHER_EARNERS_PAY }, 'taxUp'],
      [{ ...PRISONS, ...HEALTH_CUT }, 'cuts'],
      [PRISONS, 'default'],
    ];
    for (const [values, about] of cases) {
      const { reply } = speak(values, game);
      expect(reply.about, JSON.stringify(values)).toBe(about);
      expect(reply.who).toBe('The Leader of the Opposition');
      expect(reply.badge).toBe('simulated');
      expect(reply.text).not.toMatch(/\d/);
      expect(reply.sources.length).toBeGreaterThan(0);
    }
    // Borrowing up inside the rules: investment the debt rule still allows.
    expect(speak(INVESTMENT_WITHIN_RULES).reply.about).toBe('borrowingUp');
  });
});
