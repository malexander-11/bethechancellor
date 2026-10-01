import { computeOutcome, normaliseLeverValue } from '../calc/spine.js';
import { decodePermalink, encodePermalink } from '../permalink/codec.js';
import { isMissed, missedBy } from '../rules/words.js';
import type { Vintage } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import type { ShippedDataset } from '../types/shipped.js';
import { ambitionStatus } from './ambitions.js';
import { changeRows, type ChangeRow } from './changes.js';
import { finetuneNames } from './finetune.js';
import { rankedPriorities } from './options.js';
import { headroomWords, preBudget, reconcile, reconcileWords, type OutcomeOf } from './prices.js';
import { receptions, type Reception } from './reception.js';
import { macroCodesOf, suggestedSettings } from './scenarios.js';
import { FINAL_STAGE } from './stages.js';
import { budgetTheme } from './theme.js';

/** The game's files a Budget is read and summed up from: the shipped data set's, in part. */
export type GameData = Pick<
  ShippedDataset,
  | 'vintage'
  | 'rules'
  | 'levers'
  | 'context'
  | 'pm'
  | 'options'
  | 'reception'
  | 'incidence'
  | 'finetune'
>;

/**
 * The settings every Budget is worked out under (Phase 26): the interest on its own borrowing is
 * counted, and it is judged by the rules as they stand.
 */
export const GAME_SETTINGS = { debtInterestFeedback: true, assessAsOf: 'vintage' } as const;

/** The first year a measure can take effect: the forecast's second year. */
export function gameImplementationYear(vintage: Vintage): string {
  return vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? vintage.years.inYear;
}

/** Trial outcomes are cheap but not free; a screen of cards asks for a few dozen at once. */
const CACHE_LIMIT = 256;

/**
 * "What would the Budget look like if…": the engine re-run for a set of lever values under the
 * game's settings, remembered, so pricing a screen of choices costs one run each.
 */
export function gameOutcomeOf(data: Pick<GameData, 'vintage' | 'rules' | 'levers'>): OutcomeOf {
  const cache = new Map<string, Outcome>();
  const implementationYear = gameImplementationYear(data.vintage);
  return (values) => {
    const key = JSON.stringify(
      Object.keys(values)
        .sort()
        .map((code) => [code, values[code]]),
    );
    const hit = cache.get(key);
    if (hit) return hit;
    const outcome = computeOutcome({
      vintage: data.vintage,
      rules: data.rules,
      levers: data.levers,
      settings: { leverValues: values, implementationYear, ...GAME_SETTINGS },
    });
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, outcome);
    return outcome;
  };
}

/** The OBR's typical five-year receipts forecast error, £ million, at the outcome's last year. */
export function typicalErrorGbpm(vintage: Vintage, outcome: Outcome): number {
  const years = outcome.paths.years;
  const last = years[years.length - 1];
  return (
    (vintage.uncertainty.receiptsMeanAbsFiveYearErrorPctGdp / 100) *
    (last === undefined ? 0 : (outcome.paths.baseline.nominalGdpFy[last] ?? 0))
  );
}

/** A finished Budget read from its link, in the one form every link to it takes. */
export interface FinishedBudget {
  /**
   * The canonical link: today's codes, the economy on today's estimate, every value snapped to
   * its lever's steps, the priorities the game knows, at the end of the game.
   */
  query: string;
  leverValues: Record<string, number>;
  game: GamePermalink;
}

/**
 * A link read as a finished Budget, or null when it is not one: no game, or a game not yet at
 * Budget day. What the link says of the economy is replaced by today's estimate, as the game does
 * for every link (ADR-0025), so two links to the same choices read as the same Budget. Reading the
 * canonical link again gives it back unchanged.
 */
export function readFinishedBudget(data: GameData, search: string): FinishedBudget | null {
  const { state } = decodePermalink(search, data.levers);
  if (!state.game || state.game.reached !== FINAL_STAGE) return null;
  const byCode = new Map(data.levers.map((l) => [l.code, l] as const));
  const economy = new Set(macroCodesOf(data.context.readings));
  const leverValues: Record<string, number> = {};
  const set = (code: string, raw: number) => {
    const lever = byCode.get(code);
    if (!lever) return;
    const value = normaliseLeverValue(lever, raw);
    if (value !== lever.control.default) leverValues[code] = value;
  };
  for (const [code, value] of Object.entries(state.leverValues)) {
    if (!economy.has(code) && byCode.get(code)?.category !== 'macro') set(code, value);
  }
  for (const [code, value] of Object.entries(
    suggestedSettings(data.context.readings, data.levers),
  )) {
    set(code, value);
  }
  const game: GamePermalink = {
    reached: FINAL_STAGE,
    priorities: rankedPriorities(state.game, data.pm).map((p) => p.id),
  };
  const query = encodePermalink(
    {
      vintageCode: data.vintage.permalinkCode,
      rulesCode: data.rules.permalinkCode,
      implementationYear: gameImplementationYear(data.vintage),
      leverValues,
      ...GAME_SETTINGS,
      game,
    },
    data.levers,
  );
  return { query, leverValues, game };
}

/** What a finished Budget did, as the shared picture and its page say it. */
export interface BudgetSummary {
  year: string;
  /** "A Budget for safer streets and defence"; none without priorities. */
  theme?: string;
  /** Every tax moved, biggest first. */
  tax: ChangeRow[];
  /** Every other budget moved, biggest first. */
  spending: ChangeRow[];
  /** The review's reconciliation: the headroom from today's estimate to the Budget. */
  headroom: { startGbpm: number; endGbpm: number };
  /** "Headroom goes from £6.8bn to £70.5bn in 2029-30." */
  headroomLine: string;
  /** What moved it: "taxes raise £63.0bn", "day-to-day spending adds £5.1bn net". */
  moves: string[];
  rules: {
    met: boolean;
    /** Only the welfare cap is missed: both fiscal rules are met. */
    welfareOnly: boolean;
    /** "the debt rule by £4.5bn", one for each rule missed. */
    missed: string[];
  };
  ratings: Pick<Reception, 'audience' | 'title' | 'rating' | 'label'>[];
}

const bySize = (a: ChangeRow, b: ChangeRow) => Math.abs(b.gbpm) - Math.abs(a.gbpm);

/** A finished Budget summed up: every figure is the engine's, worked out again from the link. */
export function summariseBudget(
  data: GameData,
  budget: FinishedBudget,
  outcomeOf: OutcomeOf = gameOutcomeOf(data),
): BudgetSummary {
  const outcome = outcomeOf(budget.leverValues);
  const names = finetuneNames(data.finetune);
  const rows = changeRows({ outcome, levers: data.levers, names: (code) => names.get(code) }).sort(
    bySize,
  );
  const r = reconcile(outcome, preBudget(outcomeOf, budget.leverValues, data.levers));
  const missed = outcome.verdicts.filter(isMissed);
  const status = ambitionStatus(budget.game, data.pm, data.options, outcome, data.levers);
  const room = receptions({
    outcome,
    levers: data.levers,
    reception: data.reception,
    typicalErrorGbpm: typicalErrorGbpm(data.vintage, outcome),
    outcomeOf,
    pm: data.pm,
    incidence: data.incidence,
    game: budget.game,
    status,
  });
  const theme = budgetTheme(data.pm, budget.game.priorities);
  return {
    year: r.year,
    ...(theme ? { theme } : {}),
    tax: rows.filter((row) => row.side === 'tax'),
    spending: rows.filter((row) => row.side === 'spending'),
    headroom: { startGbpm: r.startGbpm, endGbpm: r.endGbpm },
    headroomLine: headroomWords(r),
    moves: reconcileWords(r),
    rules: {
      met: missed.length === 0,
      welfareOnly: missed.length > 0 && missed.every((v) => v.kind === 'welfareCap'),
      missed: missed.map(missedBy),
    },
    ratings: room.map(({ audience, title, rating, label }) => ({ audience, title, rating, label })),
  };
}

/** The picture's own words, and the lines the share and leaderboard pages build on. */
export const SHARE_WORDS = {
  game: 'What’s your Budget?',
  untitled: 'My Budget',
  tax: 'Tax',
  spending: 'Spending',
  noTax: 'No tax changed.',
  noSpending: 'No spending changed.',
  /** After the rows a list has room for. */
  more: 'and {n} more',
  /** On the picture's band, with the site's address. */
  invite: 'Make yours at {host}',
  /** A rating, as its meter is read out. */
  rating: '{label}, {rating} of 5',
} as const;

/** The rows a side of the picture has room for: three, or two and how many more. */
export const PICTURE_ROWS = 3;

export function pictureRows(rows: readonly ChangeRow[]): { shown: ChangeRow[]; more: number } {
  if (rows.length <= PICTURE_ROWS) return { shown: [...rows], more: 0 };
  return { shown: rows.slice(0, PICTURE_ROWS - 1), more: rows.length - (PICTURE_ROWS - 1) };
}

/** "a, b and c" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface SummaryWords {
  /** The Budget's name on its page and in a link's preview: its theme, or "My Budget". */
  title: string;
  /** "It meets both fiscal rules." and the like. */
  rules: string;
  /** A link's preview: what moved the headroom, where it ends, and the rules. */
  description: string;
  /** The picture in words, for anyone who cannot see it. */
  alt: string;
  /** What a player posts with the link. */
  share: string;
}

/** A finished Budget in words: the same figures the picture draws. */
export function summaryWords(s: BudgetSummary): SummaryWords {
  const title = s.theme ?? SHARE_WORDS.untitled;
  const rules = s.rules.met
    ? 'It meets both fiscal rules.'
    : s.rules.welfareOnly
      ? `It meets both fiscal rules, but misses ${list(s.rules.missed)}.`
      : `It misses ${list(s.rules.missed)}.`;
  const moves =
    s.moves.length > 0 ? `${capitalise(s.moves.join('; '))}.` : 'Nothing moves the headroom.';
  const side = (heading: string, rows: readonly ChangeRow[], none: string) => {
    if (rows.length === 0) return none;
    const { shown, more } = pictureRows(rows);
    const said = shown.map((r) => [r.name, r.standing, r.words].filter(Boolean).join(', '));
    if (more > 0) said.push(SHARE_WORDS.more.replace('{n}', String(more)));
    return `${heading}: ${said.join('; ')}.`;
  };
  const ratings = s.ratings.map(
    (r) =>
      `${r.title}: ${SHARE_WORDS.rating.replace('{label}', r.label).replace('{rating}', String(r.rating))}.`,
  );
  return {
    title,
    rules,
    description: `${moves} ${s.headroomLine} ${rules}`,
    alt: [
      `${SHARE_WORDS.game} ${title}.`,
      side(SHARE_WORDS.tax, s.tax, SHARE_WORDS.noTax),
      side(SHARE_WORDS.spending, s.spending, SHARE_WORDS.noSpending),
      s.headroomLine,
      rules,
      ...ratings,
    ].join(' '),
    share: [
      s.theme
        ? `I made ${s.theme.charAt(0).toLowerCase()}${s.theme.slice(1)}.`
        : 'I made my Budget.',
      moves,
      rules,
      SHARE_WORDS.game,
    ].join(' '),
  };
}
