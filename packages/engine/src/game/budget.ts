import { formatGbpBn } from '../format.js';
import type {
  BudgetCard,
  BudgetFile,
  BudgetMeasure,
  BudgetTheme,
  ScorecardExtract,
} from '../types/data.js';

/**
 * The placeholders the Budget's story may carry (ADR-0045), each filled by the page from the
 * engine or the file's facts: the margin's steps since the last forecast, where it ends, the
 * target year, the welfare cap's gap, and what the measures do to tax and spending by the target
 * year. The validator holds the story to this list, so no line waits on a figure nobody fills.
 */
export const BUDGET_STORY_FILLS = [
  'march',
  'debtInterest',
  'other',
  'before',
  'measures',
  'headroom',
  'year',
  'welfareGap',
  'tax',
  'spending',
] as const;

export type BudgetStoryFill = (typeof BUDGET_STORY_FILLS)[number];

/** A story line with its placeholders filled; one left unfilled stays in braces for a test to see. */
export function fillStory(text: string, fills: Partial<Record<BudgetStoryFill, string>>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in fills ? (fills[key as BudgetStoryFill] ?? whole) : whole,
  );
}

/** The placeholders a story line carries, in order, each once. */
export function storyPlaceholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ''))];
}

/** A measure's scorecard line, or undefined when the extract has no such line. */
export function measureLine(
  scorecard: ScorecardExtract,
  measure: Pick<BudgetMeasure, 'line'>,
): ScorecardExtract['measures'][number] | undefined {
  return scorecard.measures.find((m) => m.number === measure.line);
}

/** Below this a measure's figure reads as nothing, as the cards' own words do. */
const FIGURE_UNCHANGED_BELOW_GBPM = 50;

/**
 * Where a measure sits in the Budget's arithmetic (ADR-0045): which side of the scorecard, and
 * whether it reduces borrowing by the year the rules bite, read from the Treasury's own figures.
 */
export type MeasureGroup = 'taxRise' | 'taxCut' | 'lessSpending' | 'moreSpending';

export interface MeasureFigure {
  /** The scorecard's figure for the year, £ million: positive reduces borrowing. */
  gbpm: number;
  group: MeasureGroup;
  /** "raises £2.0bn in 2029-30"; "nothing in 2029-30; raises £0.8bn in 2027-28". */
  words: string;
}

/**
 * A measure's figure in the target year, in words (ADR-0045): what the Treasury scored it at,
 * on its own sign convention. A measure that does nothing in that year names the year it moves
 * most, so a measure over before the rules bite is not read as doing nothing; one scored at
 * nothing in every year says so.
 */
export function measureFigure(
  scorecard: ScorecardExtract,
  measure: Pick<BudgetMeasure, 'line'>,
  year: string,
): MeasureFigure | undefined {
  return linesFigure(scorecard, [measure.line], year);
}

/**
 * The same for several lines taken together, as a card that reverses them all shows them
 * (ADR-0046): their figures summed year by year. The lines are one side of the scorecard, which
 * the pipeline checks.
 */
export function linesFigure(
  scorecard: ScorecardExtract,
  numbers: readonly number[],
  year: string,
): MeasureFigure | undefined {
  const found = numbers.map((n) => scorecard.measures.find((m) => m.number === n));
  if (found.length === 0 || found.some((m) => !m)) return undefined;
  const lines = found as ScorecardExtract['measures'];
  const tax = lines[0]?.type === 'Tax';
  const values: Record<string, number> = {};
  for (const line of lines) {
    for (const [y, v] of Object.entries(line.values)) values[y] = (values[y] ?? 0) + v;
  }
  const verb = (gbpm: number) => {
    const size = formatGbpBn(Math.abs(gbpm), 1);
    if (gbpm > 0) return `${tax ? 'raises' : 'saves'} ${size}`;
    return `costs ${size}`;
  };
  const gbpm = values[year] ?? 0;
  const biggest = Object.entries(values)
    .filter(([y, v]) => y !== year && Math.abs(v) >= FIGURE_UNCHANGED_BELOW_GBPM)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const sign = Math.abs(gbpm) >= FIGURE_UNCHANGED_BELOW_GBPM ? gbpm : (biggest?.[1] ?? 0);
  const group: MeasureGroup = tax
    ? sign >= 0
      ? 'taxRise'
      : 'taxCut'
    : sign >= 0
      ? 'lessSpending'
      : 'moreSpending';
  const words =
    Math.abs(gbpm) >= FIGURE_UNCHANGED_BELOW_GBPM
      ? `${verb(gbpm)} in ${year}`
      : biggest
        ? `nothing in ${year}; ${verb(biggest[1])} in ${biggest[0]}`
        : `nothing in ${year}`;
  return { gbpm, group, words };
}

/** The measures a card reverses: every one that names its lever, in the file's order. */
export function cardMeasures(budget: BudgetFile, card: Pick<BudgetCard, 'lever'>): BudgetMeasure[] {
  return budget.measures.filter((m) => m.leverCode === card.lever);
}

/** The theme a lever's card is in, and the card, or nothing for a lever the walk does not ask about. */
export function cardOf(
  budget: BudgetFile,
  code: string,
): { theme: BudgetTheme; card: BudgetCard } | undefined {
  for (const theme of budget.themes) {
    const card = theme.cards.find((c) => c.lever === code);
    if (card) return { theme, card };
  }
  return undefined;
}

/** The measures no card asks about: the walk's small print, voted on and moving no money. */
export function smallPrint(budget: BudgetFile): BudgetMeasure[] {
  const carded = new Set(budget.themes.flatMap((t) => t.cards.map((c) => c.lever)));
  return budget.measures.filter((m) => !m.leverCode || !carded.has(m.leverCode));
}

/**
 * What keeps the measure list and the scorecard it joins to the same list: every line of the
 * extract listed once, and no measure for a line the extract does not have. The engine's own
 * validation holds the rest (the levers, the facts, the story); this needs the extract, which only
 * the pipeline and the tests have.
 */
export function budgetScorecardProblems(budget: BudgetFile, scorecard: ScorecardExtract): string[] {
  const problems: string[] = [];
  if (scorecard.sourceId !== budget.scorecard) {
    problems.push(
      `budget ${budget.id} joins scorecard ${budget.scorecard}, but the extract is ${scorecard.sourceId}`,
    );
  }
  const listed = new Set(budget.measures.map((m) => m.line));
  for (const line of scorecard.measures) {
    if (!listed.has(line.number)) {
      problems.push(
        `budget ${budget.id} does not list line ${line.number} of ${scorecard.sourceId}`,
      );
    }
  }
  const numbers = new Set(scorecard.measures.map((m) => m.number));
  for (const measure of budget.measures) {
    if (!numbers.has(measure.line)) {
      problems.push(
        `budget measure ${measure.id} is line ${measure.line}, which ${scorecard.sourceId} does not have`,
      );
    }
  }
  // A card sums its lines into one figure (ADR-0046), so they must be one side of the scorecard.
  for (const theme of budget.themes) {
    for (const card of theme.cards) {
      const types = new Set(
        cardMeasures(budget, card).map((m) => measureLine(scorecard, m)?.type ?? 'missing'),
      );
      if (types.size > 1) {
        problems.push(
          `budget card ${card.lever} mixes tax and spending lines of ${scorecard.sourceId}`,
        );
      }
    }
  }
  return problems;
}
