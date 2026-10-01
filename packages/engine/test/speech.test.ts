import { describe, expect, it } from 'vitest';
import {
  ambitionStatus,
  assembleSpeech,
  computeOutcome,
  formatGbpBn,
  freshGame,
  isMissed,
  macroCodesOf,
  missedBy,
  type GamePermalink,
  type OppositionTopic,
  type Speech,
} from '../src/index.js';
import { filledFrom, loadDataset, outcomeOfFor, wording } from './fixtures.js';
import {
  CORPORATION_TAX_RISE,
  DAY_TO_DAY_RULE_MISSED,
  DEBT_RULE_MISSED,
  DEFENCE_GAP,
  ESTATES_AND_HOMES_PAY,
  HEALTH_ABOVE_PLAN,
  HEALTH_CUT,
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
const { speech } = ds;

/** A Budget delivered with its measures from 2027-28: its figures, its priorities and its speech. */
function deliver(values: Budget, game?: GamePermalink) {
  const outcome = computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues: values, implementationYear: '2027-28' },
  });
  const status = game ? ambitionStatus(game, ds.pm, ds.options, outcome, ds.levers) : undefined;
  const said = assembleSpeech({
    speech,
    outcome,
    levers: ds.levers,
    ...(game && status ? { game, status } : {}),
    pm: ds.pm,
    macroCodes: MACRO,
    outcomeOf,
  });
  return { outcome, status, speech: said };
}
const speak = (values: Budget, game?: GamePermalink) => deliver(values, game).speech;
const paragraph = (s: Speech, kind: Speech['paragraphs'][number]['kind']) =>
  s.paragraphs.find((p) => p.kind === kind);
/** A lever in running words, as the speech names it. */
const noun = (code: string) => ds.levers.find((l) => l.code === code)?.noun ?? code;
/** The forecast paragraph's template, with the change it reports. */
const forecastSaying = (change: keyof typeof speech.forecastChange) =>
  speech.forecast.text.replace('{change}', speech.forecastChange[change].text);

const heard = (values: Budget, game?: GamePermalink) => ({ values, game });
/** The Budgets the speech is heard on, each named for the part it plays. */
const SPEECHES = {
  'the cost of living, paid for by the top and business': heard(
    { ufsm: 1, bus2: 1, alc: -5, ct: 1, it50: 1 },
    gameWith(['cost-of-living']),
  ),
  'defence delivered, the cost of living left': heard(
    DEFENCE_GAP,
    gameWith(['defence', 'cost-of-living']),
  ),
  'safer streets delivered, defence left': heard(PRISONS, gameWith(SECURITY)),
  'a start on the NHS': heard(NHS_START, gameWith(['nhs'])),
  'nothing funded': heard({}, gameWith(SECURITY)),
  'a penny, no game': heard(PENNY),
  'health above plan, no game': heard(HEALTH_ABOVE_PLAN),
  'nothing, no game': heard({}),
  'the day-to-day rule missed': heard(DAY_TO_DAY_RULE_MISSED, freshGame()),
  'the debt rule missed by investing': heard(DEBT_RULE_MISSED),
  'cuts, benefit savings and a tax cut': heard({ dhsc: -2, rvpip: 1, wuc: -3, alc: -5 }),
  'prisons and a corporation tax rise': heard(
    { ...PRISONS, ...CORPORATION_TAX_RISE },
    gameWith(['safer-streets']),
  ),
  'prisons paid for by estates and home buyers': heard(
    { ...PRISONS, ...ESTATES_AND_HOMES_PAY },
    gameWith(['safer-streets']),
  ),
  'prisons and a health cut': heard({ ...PRISONS, ...HEALTH_CUT }, gameWith(['safer-streets'])),
  'investment within the rules': heard(INVESTMENT_WITHIN_RULES),
};
type Heard = keyof typeof SPEECHES;
const delivered = new Map<Heard, ReturnType<typeof deliver>>();
/** A named Budget, delivered once. */
function hear(name: Heard) {
  const hit = delivered.get(name);
  if (hit) return hit;
  const done = deliver(SPEECHES[name].values, SPEECHES[name].game);
  delivered.set(name, done);
  return done;
}

describe('the speech', () => {
  it('reads as recorded; a rewording is an updated snapshot and a reviewed diff', () => {
    const record = Object.fromEntries(
      (Object.keys(SPEECHES) as Heard[]).map((name) => {
        const s = hear(name).speech;
        return [
          name,
          [
            ...s.paragraphs.map((p) => `${p.kind}: ${wording(p.text)}`),
            `reply (${s.reply.about}): ${s.reply.text}`,
          ],
        ];
      }),
    );
    expect(record).toMatchSnapshot();
  });

  it('is deterministic, stays inside its word budget, and repeats no fragment', () => {
    const game: GamePermalink = { ...freshGame(), priorities: ['nhs', 'schools-send'] };
    const values = {
      dhsc: 3,
      dfe: 5,
      mhclg: 5,
      ufsm: 1,
      itbr: 1,
      ct: 1,
      itbrl: -10,
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
    const { status, speech: s } = hear('the cost of living, paid for by the top and business');
    const kinds = s.paragraphs.map((p) => p.kind);
    expect(kinds[0]).toBe('opening');
    expect(filledFrom(speech.opening['cost-of-living']?.text, s.paragraphs[0]?.text)).toBe(true);
    // One paragraph for the priority, naming each way chosen to deliver it.
    const priority = s.paragraphs.filter((p) => p.kind === 'priority');
    expect(priority).toHaveLength(1);
    expect(filledFrom(speech.priority.text, priority[0]?.text)).toBe(true);
    const ways = status?.priorities[0]?.options.filter((o) => o.state === 'on') ?? [];
    expect(ways.length).toBeGreaterThan(0);
    for (const way of ways) {
      expect(priority[0]?.text.toLowerCase()).toContain(way.option.title.toLowerCase());
    }
    // Who pays, each class of revenue in its own words, naming its measures.
    const revenue = (cls: string, code: string) =>
      s.paragraphs.some(
        (p) =>
          p.kind === 'revenue' &&
          filledFrom(speech.revenue[cls]?.text, p.text) &&
          p.text.includes(noun(code)),
      );
    expect(revenue('top', 'it50')).toBe(true);
    expect(revenue('business', 'ct')).toBe(true);
    expect(paragraph(s, 'giveaways')?.text).toContain(noun('alc'));
    // A broken promise is named in running words (Phase 25), never by its title's statement.
    const broken = status?.promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
    expect(broken?.length).toBeGreaterThan(0);
    for (const p of broken ?? []) {
      expect(paragraph(s, 'lock-break')?.text).toContain(p.promise.noun);
      expect(paragraph(s, 'lock-break')?.text).not.toContain(p.promise.title);
    }
    expect(kinds[kinds.length - 1]).toBe('peroration');
  });

  it('opens on the first priority delivered, a start as a start, and the estimate otherwise', () => {
    const opening = (name: Heard) => hear(name).speech.paragraphs[0];
    const defence = opening('defence delivered, the cost of living left');
    expect(defence?.kind).toBe('opening');
    expect(filledFrom(speech.opening.defence?.text, defence?.text)).toBe(true);
    // Defence ranked first and left unfunded: the speech opens on what it did fund (Phase 25).
    const prisons = opening('safer streets delivered, defence left');
    expect(filledFrom(speech.opening['safer-streets']?.text, prisons?.text)).toBe(true);
    expect(filledFrom(speech.opening.defence?.text, prisons?.text)).toBe(false);
    // A priority only started is said as a start, not as a priority delivered.
    const started = hear('a start on the NHS').speech;
    const nhs = ds.pm.priorities.find((p) => p.id === 'nhs')?.noun;
    expect(filledFrom(speech.openingStarted.text, started.paragraphs[0]?.text)).toBe(true);
    expect(started.paragraphs[0]?.text).toContain(nhs);
    expect(started.paragraphs.some((p) => p.kind === 'priority')).toBe(false);
    // Nothing funded, or no game: the opening names what the Budget is built on, the March
    // forecast brought up to date, never a forecast that arrived later.
    for (const plain of [opening('nothing funded'), opening('a penny, no game')]) {
      expect(filledFrom(speech.opening.default?.text, plain?.text)).toBe(true);
      expect(plain?.text).not.toMatch(/this morning/);
    }
  });

  it('owns the forecast: borrowing before any measure, then what the Budget does to it', () => {
    const { outcome, speech: cut } = hear('a penny, no game');
    const forecast = paragraph(cut, 'forecast');
    expect(cut.paragraphs[1]).toBe(forecast);
    expect(filledFrom(forecastSaying('down'), forecast?.text)).toBe(true);
    // Borrowing in the year the Budget is delivered, the one before its measures start, and in the
    // target year; each figure the engine's.
    const target = outcome.verdicts.find((v) => v.kind === 'currentBudget')?.targetYear ?? '';
    expect(forecast?.text).toContain('in 2026-27');
    expect(forecast?.text).toContain(`in ${target}`);
    expect(forecast?.figures).toHaveLength(3);
    for (const figure of forecast?.figures ?? []) expect(forecast?.text).toContain(figure);
    const moved = (name: Heard) => paragraph(hear(name).speech, 'forecast')?.text;
    expect(filledFrom(forecastSaying('up'), moved('health above plan, no game'))).toBe(true);
    expect(filledFrom(forecastSaying('same'), moved('nothing, no game'))).toBe(true);
  });

  it('owns a missed rule by its own name and margin, and says so plainly when every rule is met', () => {
    const missed = hear('the day-to-day rule missed');
    const missedLast = missed.speech.paragraphs.at(-1);
    expect(missedLast?.kind).toBe('peroration');
    expect(filledFrom(speech.peroration.missed?.text, missedLast?.text)).toBe(true);
    const rules = missed.outcome.verdicts.filter(isMissed);
    expect(rules.length).toBeGreaterThan(0);
    for (const v of rules) expect(missedLast?.text).toContain(missedBy(v));
    // Investment misses the debt rule alone: the speech names that rule and its own margin, not
    // the day-to-day rule's (Phase 25).
    const investment = hear('the debt rule missed by investing');
    const debt = investment.outcome.verdicts.find((v) => v.kind === 'stockFalling');
    const dayToDay = investment.outcome.verdicts.find((v) => v.kind === 'currentBudget');
    if (!debt || !dayToDay) throw new Error('the rules have no debt or day-to-day rule');
    expect(debt.status).toBe('notMet');
    expect(dayToDay.status).toBe('met');
    const last = investment.speech.paragraphs.at(-1);
    expect(last?.text).toContain(missedBy(debt));
    expect(last?.text).not.toContain(dayToDay.shortName);
    expect(last?.figures).toEqual([formatGbpBn(Math.abs(debt.headroomGbpm), 1)]);
    // Every rule met: the headroom and the target year, the engine's own.
    const met = hear('a penny, no game');
    const metLast = met.speech.paragraphs.at(-1);
    const stability = met.outcome.verdicts.find((v) => v.kind === 'currentBudget');
    expect(filledFrom(speech.peroration.met?.text, metLast?.text)).toBe(true);
    expect(metLast?.text).toContain(formatGbpBn(stability?.headroomGbpm ?? Number.NaN, 1));
    expect(metLast?.text).toContain(stability?.targetYear);
    // The game's estimate is never passed off as the OBR's confirmation.
    for (const s of [missed, investment, met]) {
      expect(s.speech.paragraphs.some((p) => /confirms/.test(p.text))).toBe(false);
    }
    // Phase 24 retired the add-on flourish, the compromises and the delays: none is ever said.
    for (const s of [missed, met]) {
      for (const p of s.speech.paragraphs) {
        expect(['rabbit', 'compromises', 'delay']).not.toContain(p.kind);
      }
    }
  });

  it('names measures in running words, and says benefits apart from departments', () => {
    const s = hear('cuts, benefit savings and a tax cut').speech;
    const cuts = paragraph(s, 'cuts');
    expect(filledFrom(speech.cuts.text, cuts?.text)).toBe(true);
    expect(cuts?.text).toContain(noun('dhsc'));
    const welfare = paragraph(s, 'welfare-cuts');
    expect(filledFrom(speech.welfareCuts.text, welfare?.text)).toBe(true);
    for (const code of ['rvpip', 'wuc']) {
      expect(welfare?.text).toContain(noun(code));
      expect(cuts?.text).not.toContain(noun(code));
    }
    expect(welfare?.text).not.toContain(noun('dhsc'));
    expect(paragraph(s, 'giveaways')?.text).toContain(noun('alc'));
    // No lever's short title leaks into a list: the old "will do more with less" is gone.
    expect(s.paragraphs.some((p) => /do more with less/.test(p.text))).toBe(false);
  });

  it('lets the Leader of the Opposition reply, on the Budget’s biggest weakness, with no figure', () => {
    const cases: [Heard, OppositionTopic][] = [
      ['the day-to-day rule missed', 'rulesMissed'],
      ['prisons and a corporation tax rise', 'promiseBroken'],
      ['prisons paid for by estates and home buyers', 'taxUp'],
      ['prisons and a health cut', 'cuts'],
      ['safer streets delivered, defence left', 'default'],
      // Borrowing up inside the rules: investment the debt rule still allows.
      ['investment within the rules', 'borrowingUp'],
    ];
    for (const [name, about] of cases) {
      const { reply } = hear(name).speech;
      expect(reply.about, name).toBe(about);
      expect(reply.text, name).toBe(speech.opposition[about].text);
      expect(reply.who).toBe('The Leader of the Opposition');
      expect(reply.badge).toBe('simulated');
      expect(reply.text).not.toMatch(/\d/);
      expect(reply.sources.length).toBeGreaterThan(0);
    }
  });
});
