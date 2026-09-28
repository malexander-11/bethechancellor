import { prevFy } from '../calc/years.js';
import { formatGbpBn } from '../format.js';
import { isMissed, missedBy } from '../rules/words.js';
import type { Lever, PmFile, SourceRef, SpeechFile, SpeechFragment } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import type { AmbitionStatus } from './ambitions.js';
import { rankedPriorities } from './options.js';
import { preBudget, priceMove, withDefaults, type OutcomeOf } from './prices.js';
import { prioritiesInWords } from './verdict.js';

/**
 * The speech (stage 7), assembled from authored fragments. Every figure in it is read from the
 * outcome and formatted the way the scorecard formats it; every title comes from data. The
 * assembler is deterministic and never writes a sentence of its own: it chooses fragments and
 * fills their placeholders. Each paragraph wears the simulated badge, because a Chancellor's
 * words are the one thing in this tool nobody published.
 */

export type SpeechParagraphKind =
  | 'opening'
  | 'forecast'
  | 'priority'
  | 'spending'
  | 'cuts'
  | 'welfare-cuts'
  | 'revenue'
  | 'giveaways'
  | 'lock-break'
  | 'peroration';

export interface SpeechParagraph {
  kind: SpeechParagraphKind;
  text: string;
  sources: SourceRef[];
  badge: 'simulated';
  /** The engine figures this paragraph quotes, as formatted, so a test can check every number. */
  figures: string[];
}

/** What the reply is about: the Budget's biggest weakness, in this order. */
export type OppositionTopic =
  'rulesMissed' | 'promiseBroken' | 'taxUp' | 'borrowingUp' | 'cuts' | 'default';

/**
 * The Leader of the Opposition replies (Phase 25): one line, chosen by the Budget's biggest
 * weakness, in a voice from the other side of the House. A role, never a name; a judgement badged
 * as one, with no figure in it.
 */
export interface OppositionReply {
  who: string;
  about: OppositionTopic;
  text: string;
  sources: SourceRef[];
  badge: 'simulated';
}

export interface Speech {
  paragraphs: SpeechParagraph[];
  words: number;
  reply: OppositionReply;
}

/** A tax rise, extra borrowing or a cut the Opposition would make a line of, £ million. */
export const OPPOSITION_GBPM = 2_000;

export interface SpeechInput {
  speech: SpeechFile;
  outcome: Outcome;
  levers: readonly Lever[];
  game?: GamePermalink;
  pm?: PmFile;
  status?: AmbitionStatus;
  macroCodes: readonly string[];
  /**
   * The engine re-run under the Budget's own settings (Phase 25): a priority's figure is its one
   * price, what its options do to the headroom, the figure its cards and the review show.
   */
  outcomeOf: OutcomeOf;
}

/** Who a revenue measure falls on. A closed map, so the speech never guesses. */
const REVENUE_CLASS: Record<string, string> = {
  itbr: 'broad',
  ithr: 'broad',
  nicm: 'broad',
  nica: 'broad',
  vats: 'broad',
  vatr: 'broad',
  itpa: 'broad',
  nicpt: 'broad',
  itbrl: 'broad',
  itar: 'top',
  it50: 'top',
  cgth: 'top',
  iht: 'top',
  wealth: 'top',
  pens30: 'top',
  iinc2: 'top',
  sdlt5: 'top',
  ct: 'business',
  nicer: 'business',
  nicst: 'business',
  nicpen: 'business',
  brates: 'business',
  bank5: 'business',
  hscl: 'broad',
  epl2: 'business',
  cgtdth: 'top',
  hvcts15: 'top',
  rvapr: 'top',
  nic4: 'broad',
  vatgas: 'broad',
  vatelec: 'broad',
  nicspa: 'broad',
  nicllp: 'top',
  cgtalign: 'top',
  cgtl: 'top',
  cgtexit: 'top',
  cgtprr: 'top',
  pens20: 'top',
  banklevy: 'business',
  nicrent: 'top',
  qelevy: 'business',
  carried: 'top',
  wealth2: 'top',
  sugsalt: 'broad',
  vatthr: 'business',
  ctgh: 'top',
  nicuel: 'top',
  vat1z: 'base',
  pslump: 'top',
  sdltabol: 'top',
  cta: 'broad',
  vatmot: 'broad',
  hmrc2: 'compliance',
  badr: 'top',
  rnrb: 'top',
  fuel: 'motorists',
  rvfuel: 'motorists',
  ved: 'motorists',
  alc: 'duties',
  tob: 'duties',
  apd: 'duties',
  rvgam: 'duties',
  gam2: 'duties',
  ipt: 'broad',
  vatfood: 'base',
  vatnrg: 'base',
  vatkids: 'base',
  vatbook: 'base',
  vattrn: 'base',
  vathome: 'base',
};

const MAX_PRIORITIES_SAID = 3;
const MAX_LIST = 3;

function fill(fragment: SpeechFragment, values: Record<string, string>): string {
  return fragment.text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

function list(titles: string[]): string {
  const shown = titles.slice(0, MAX_LIST);
  const rest = titles.length - shown.length;
  const joined =
    shown.length <= 1
      ? (shown[0] ?? '')
      : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${joined}, and ${rest} more` : joined;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Below this a move in borrowing reads as none. */
const UNCHANGED_GBPM = 50;

export function assembleSpeech(input: SpeechInput): Speech {
  const { speech, outcome, levers, game, status, macroCodes } = input;
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const paragraphs: SpeechParagraph[] = [];
  const say = (
    kind: SpeechParagraphKind,
    fragment: SpeechFragment | undefined,
    vars: Record<string, string>,
    figures: string[] = [],
  ) => {
    if (!fragment) return;
    paragraphs.push({
      kind,
      text: fill(fragment, vars),
      sources: fragment.sources,
      badge: 'simulated',
      figures,
    });
  };
  const money = (gbpm: number) => formatGbpBn(gbpm, 1);
  const effectOf = (code: string) => {
    const e = outcome.leverEffects.find((x) => x.code === code);
    if (!e) return { cost: 0, receipts: 0 };
    return {
      cost: (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0),
      receipts: e.receipts[year] ?? 0,
    };
  };

  // Opening, keyed to the first priority delivered in full (Phase 25): the speech never claims a
  // priority the Budget did not fund. A start is said as a start; with neither, the estimate.
  const ranked = game && input.pm ? rankedPriorities(game, input.pm) : [];
  const fate = new Map((status?.priorities ?? []).map((p) => [p.priority.id, p.status] as const));
  const firstDelivered = ranked.find((p) => fate.get(p.id) === 'delivered');
  const firstStarted = ranked.find(
    (p) => fate.get(p.id) === 'started' || fate.get(p.id) === 'settledLower',
  );
  const openingVars = {
    targetYear: year,
    priorities: input.pm ? prioritiesInWords(input.pm, game?.priorities ?? []) : '',
  };
  if (firstDelivered && speech.opening[firstDelivered.id]) {
    say('opening', speech.opening[firstDelivered.id], openingVars);
  } else if (firstStarted) {
    say('opening', speech.openingStarted, { priority: firstStarted.noun });
  } else {
    say('opening', speech.opening.default, openingVars);
  }

  // The forecast, owned (Phase 25): borrowing before any measure, this year and in the target
  // year, then what the Budget does to it. Worked out, so the fall already in the forecast is not
  // credited to the Budget.
  const values = outcome.settings.leverValues;
  const pre = preBudget(input.outcomeOf, values, levers);
  // The year the Budget is delivered in: the one before its measures start.
  const policyYears = outcome.paths.policyYears;
  const budgetYear = prevFy(outcome.settings.implementationYear);
  const startYear = policyYears.includes(budgetYear) ? budgetYear : (policyYears[0] ?? year);
  const borrowingThen = money(pre.paths.policy.psnb[startYear] ?? 0);
  const borrowingTarget = money(pre.paths.policy.psnb[year] ?? 0);
  const borrowingChange =
    (outcome.paths.policy.psnb[year] ?? 0) - (pre.paths.policy.psnb[year] ?? 0);
  const amount = money(Math.abs(borrowingChange));
  const changeFragment =
    borrowingChange >= UNCHANGED_GBPM
      ? speech.forecastChange.up
      : borrowingChange <= -UNCHANGED_GBPM
        ? speech.forecastChange.down
        : speech.forecastChange.same;
  const changeText = fill(changeFragment, { amount, targetYear: year });
  say(
    'forecast',
    speech.forecast,
    { borrowingThen, startYear, borrowingTarget, targetYear: year, change: changeText },
    [
      borrowingThen,
      borrowingTarget,
      ...(Math.abs(borrowingChange) >= UNCHANGED_GBPM ? [amount] : []),
    ],
  );

  // One paragraph per priority delivered, in rank order, naming the options that deliver it.
  const delivered = (status?.priorities ?? [])
    .filter((p) => p.status === 'delivered')
    .slice(0, MAX_PRIORITIES_SAID);
  const deliveredCodes = new Set(
    delivered.flatMap((p) =>
      p.options.filter((o) => o.state === 'on').flatMap((o) => Object.keys(o.option.values)),
    ),
  );
  for (const p of delivered) {
    const on = p.options.filter((o) => o.state === 'on');
    const codes = on.flatMap((o) => Object.keys(o.option.values));
    const price = priceMove({
      outcomeOf: input.outcomeOf,
      levers,
      from: withDefaults(values, codes, levers),
      to: values,
    });
    // The one price (Phase 25): what the options do to the headroom, costing or saving.
    const change = price.headroomChangeGbpm;
    const cost = money(Math.abs(change));
    const priced = Math.abs(change) >= UNCHANGED_GBPM;
    say(
      'priority',
      speech.priority,
      {
        title: p.priority.title,
        options: list(on.map((o) => lower(o.option.title))),
        price: !priced ? 'at no cost' : change < 0 ? `costing ${cost}` : `saving ${cost}`,
        targetYear: year,
      },
      priced ? [cost] : [],
    );
  }

  // Other spending, cuts, revenue and giveaways, read off the package. Each measure is named in
  // running words, the lever's own noun (Phase 25); benefits are said apart from departments.
  const nounOf = (lever: Lever) => lever.noun ?? lower(lever.shortTitle);
  const spending: string[] = [];
  const cuts: string[] = [];
  const welfareCuts: string[] = [];
  const revenue = new Map<string, { titles: string[]; yieldGbpm: number }>();
  const giveaways: string[] = [];
  for (const effect of outcome.leverEffects) {
    const lever = byCode.get(effect.code);
    if (!lever || lever.category === 'macro' || macroCodes.includes(lever.code)) continue;
    if (deliveredCodes.has(lever.code)) continue;
    const { cost, receipts } = effectOf(lever.code);
    if (lever.category === 'tax' || receipts !== 0) {
      if (receipts > 0) {
        const cls = REVENUE_CLASS[lever.code] ?? 'broad';
        const entry = revenue.get(cls) ?? { titles: [], yieldGbpm: 0 };
        entry.titles.push(nounOf(lever));
        entry.yieldGbpm += receipts;
        revenue.set(cls, entry);
      } else if (receipts < 0) {
        giveaways.push(nounOf(lever));
      }
      continue;
    }
    if (cost > 0) spending.push(nounOf(lever));
    else if (cost < 0) (lever.category === 'welfare' ? welfareCuts : cuts).push(nounOf(lever));
  }
  if (spending.length > 0) say('spending', speech.spending, { measures: list(spending) });
  if (cuts.length > 0) say('cuts', speech.cuts, { measures: list(cuts) });
  if (welfareCuts.length > 0) {
    say('welfare-cuts', speech.welfareCuts, { measures: list(welfareCuts) });
  }
  for (const [cls, entry] of [...revenue.entries()].sort(
    (a, b) => b[1].yieldGbpm - a[1].yieldGbpm,
  )) {
    const fragment = speech.revenue[cls] ?? speech.revenue.broad;
    const yieldText = money(entry.yieldGbpm);
    say('revenue', fragment, { measures: list(entry.titles), yield: yieldText, targetYear: year }, [
      yieldText,
    ]);
  }
  if (giveaways.length > 0) say('giveaways', speech.giveaways, { measures: list(giveaways) });

  // Promises broken by choice are owned, once, by their names in running words.
  const broken = (status?.promises ?? []).filter(
    (p) => !p.kept && p.promise.judgedBy !== 'fiscalRules',
  );
  if (broken.length > 0) {
    say('lock-break', speech.lockBreak, { promises: list(broken.map((p) => p.promise.noun)) });
  }

  // The last word, on today's estimate (Phase 25): a rule met with its headroom, and the OBR's
  // own verdict still to come; a rule missed by its plain name and its own margin, each one.
  const missed = outcome.verdicts.filter(isMissed);
  if (missed.length === 0) {
    const closing = money(headroom);
    say('peroration', speech.peroration.met, { headroom: closing, targetYear: year }, [closing]);
  } else {
    say(
      'peroration',
      speech.peroration.missed ?? speech.peroration.met,
      { missed: list(missed.map(missedBy)), targetYear: year },
      missed.map((v) => money(Math.abs(v.headroomGbpm))),
    );
  }

  // The Opposition's reply, from the Budget's biggest weakness.
  let rises = 0;
  let taxCuts = 0;
  let spendingCuts = 0;
  for (const e of outcome.leverEffects) {
    if (e.category === 'macro') continue;
    const r = e.receipts[year] ?? 0;
    if (r > 0) rises += r;
    else taxCuts -= r;
    const s = (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0);
    if (s < 0) spendingCuts -= s;
  }
  const about: OppositionTopic = missed.some((v) => v.kind !== 'welfareCap')
    ? 'rulesMissed'
    : broken.length > 0
      ? 'promiseBroken'
      : rises - taxCuts >= OPPOSITION_GBPM
        ? 'taxUp'
        : borrowingChange >= OPPOSITION_GBPM
          ? 'borrowingUp'
          : spendingCuts >= OPPOSITION_GBPM
            ? 'cuts'
            : 'default';
  const replyLine = speech.opposition[about];
  const reply: OppositionReply = {
    who: 'The Leader of the Opposition',
    about,
    text: replyLine.text,
    sources: replyLine.sources,
    badge: 'simulated',
  };

  const words = paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);
  return { paragraphs, words, reply };
}
