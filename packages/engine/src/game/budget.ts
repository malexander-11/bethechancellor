import type { BudgetFile, BudgetMeasure, ScorecardExtract } from '../types/data.js';

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
  return problems;
}
