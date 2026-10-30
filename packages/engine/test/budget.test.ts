import { describe, expect, it } from 'vitest';
import {
  BUDGET_STORY_FILLS,
  budgetFileSchema,
  budgetScorecardProblems,
  computeOutcome,
  fillStory,
  finetuneNames,
  measureLine,
  storyPlaceholders,
  validateDataset,
  type BudgetFile,
} from '../src/index.js';
import { loadDataset, loadExtracts } from './fixtures.js';

/**
 * The Budget the game starts from (ADR-0045): the Treasury's scorecard in plain words, joined to
 * its figures by line, with the measures the game offers as levers named. These tests hold the
 * file to its rules; which measure is a lever, and what each says, is the data's to say.
 */
const ds = loadDataset();
const budget = ds.budget;
const scorecard = loadExtracts().scorecards?.[budget.scorecard];
if (!scorecard) throw new Error(`no extract for ${budget.scorecard}`);
const target = ds.vintage.checks.stabilityHeadroomGbpm.year;

/** What validate:data says of a copy of the file changed by `patch`, with the rest of the data. */
function tamper(patch: (b: BudgetFile) => void): string {
  const copy: BudgetFile = structuredClone(budget);
  patch(copy);
  return validateDataset({ ...ds, budget: copy }).join('\n');
}

const outcomeOf = (leverValues: Record<string, number>) =>
  computeOutcome({
    vintage: ds.vintage,
    rules: ds.rules,
    levers: ds.levers,
    settings: { leverValues, debtInterestFeedback: false },
  });
const headroomOf = (leverValues: Record<string, number>) =>
  outcomeOf(leverValues).verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ??
  Number.NaN;
/** What a set of levers adds to borrowing in the target year, before any interest on it. */
const borrowingOf = (leverValues: Record<string, number>) => {
  const { paths } = outcomeOf(leverValues);
  return (paths.policy.psnb[target] ?? 0) - (paths.baseline.psnb[target] ?? 0);
};

describe('the Budget the game starts from (ADR-0045)', () => {
  it('lists every line of the scorecard once, and nothing the scorecard does not have', () => {
    expect(validateDataset(ds)).toEqual([]);
    expect(budgetScorecardProblems(budget, scorecard)).toEqual([]);
    expect(budget.measures.length).toBe(scorecard.measures.length);
    for (const measure of budget.measures) {
      expect(measureLine(scorecard, measure), measure.id).toBeDefined();
    }
  });

  it('offers a measure as a lever only when the lever undoes that very line, live and on step 4', () => {
    const onStep4 = finetuneNames(ds.finetune);
    const movable = budget.measures.filter((m) => m.leverCode);
    expect(movable.length).toBeGreaterThan(20);
    for (const measure of movable) {
      const code = measure.leverCode ?? '';
      const lever = ds.levers.find((l) => l.code === code);
      expect(lever, `${measure.id} names ${code}`).toBeDefined();
      expect(lever?.deprecated, code).toBeFalsy();
      expect(onStep4.has(code), `${code} on step 4`).toBe(true);
      expect(lever?.control.kind, code).toBe('toggle');
      // Switched on, the lever puts the Treasury's figure for its lines back on borrowing in the
      // target year, whichever side of the scorecard the lines sit on (positive reduced it).
      const raw = lever && 'rawSource' in lever.costing ? lever.costing.rawSource : undefined;
      if (raw?.kind !== 'hmtScorecard') throw new Error(`${code} is not costed from the scorecard`);
      const lines = raw.lines.reduce((sum, l) => sum + (l.values[target] ?? 0), 0);
      expect(borrowingOf({ [code]: 1 }), code).toBeCloseTo(lines, 6);
    }
  });

  it('refuses a measure that names a shelved lever, or a lever not costed from its line', () => {
    const shelved = ds.levers.find((l) => l.deprecated)?.code;
    const other = ds.levers.find((l) => l.code === 'rvfrz')?.code;
    if (!shelved || !other)
      throw new Error('the data has no shelved lever or no rvfrz to test with');
    const m45 = (b: BudgetFile) => b.measures.find((m) => m.line === 45);
    expect(
      tamper((b) => {
        const m = m45(b);
        if (m) m.leverCode = shelved;
      }),
    ).toMatch(/shelved lever/);
    expect(
      tamper((b) => {
        const m = m45(b);
        if (m) m.leverCode = other;
      }),
    ).toMatch(/not costed from line 45/);
    expect(
      tamper((b) => {
        const m = m45(b);
        if (m) m.leverCode = 'nosuch';
      }),
    ).toMatch(/unknown lever nosuch/);
  });

  it('adds the published steps of the margin up to the forecast the engine reproduces', () => {
    const f = budget.facts;
    expect(
      f.headroomInMarchGbpm.gbpm +
        f.debtInterestSinceMarchGbpm.gbpm +
        f.otherChangesSinceMarchGbpm.gbpm,
    ).toBe(f.headroomBeforeMeasuresGbpm.gbpm);
    expect(f.headroomBeforeMeasuresGbpm.gbpm + f.measuresOnCurrentBudgetGbpm.gbpm).toBeCloseTo(
      headroomOf({}),
      -3,
    );
    for (const fact of Object.values(f)) expect(fact.source.quote).toBeTruthy();
    expect(tamper((b) => (b.facts.otherChangesSinceMarchGbpm.gbpm += 100))).toMatch(
      /steps since March/,
    );
    expect(tamper((b) => (b.facts.measuresOnCurrentBudgetGbpm.gbpm += 1000))).toMatch(
      /not the vintage's/,
    );
    expect(tamper((b) => delete b.facts.headroomInMarchGbpm.source.quote)).toMatch(
      /quotes nothing/,
    );
  });

  it('tells its story with placeholders the page fills, and fills them', () => {
    const used = new Set(budget.story.flatMap((line) => storyPlaceholders(line.text)));
    expect(used.size).toBeGreaterThan(0);
    for (const key of used) expect(BUDGET_STORY_FILLS).toContain(key);
    expect(tamper((b) => (b.story[0]!.text += ' {nosuch}'))).toMatch(/no fill for \{nosuch\}/);
    expect(fillStory('Headroom of {headroom} in {year}.', { headroom: '£14.5bn' })).toBe(
      'Headroom of £14.5bn in {year}.',
    );
    expect(storyPlaceholders('{a} and {b} and {a}')).toEqual(['a', 'b']);
  });

  it('names the Chancellor once, from a quoted source, and nobody else', () => {
    expect(budget.chancellor.source.quote).toContain(budget.chancellor.name);
    expect(tamper((b) => delete b.chancellor.source.quote)).toMatch(/names the Chancellor/);
    const everywhereElse = [
      ...budget.story.map((s) => s.text),
      ...budget.measures.map((m) => m.plain),
    ];
    for (const text of everywhereElse) expect(text).not.toContain(budget.chancellor.name);
  });

  it('lists each line once, and never both offers a measure and says it cannot be moved', () => {
    const twice = structuredClone(budget);
    twice.measures.push({ ...twice.measures[0]!, id: 'm999' });
    expect(budgetFileSchema.safeParse(twice).success).toBe(false);
    const both = structuredClone(budget);
    const m = both.measures.find((x) => x.leverCode);
    if (m) m.notMovable = { reason: 'no' };
    expect(budgetFileSchema.safeParse(both).success).toBe(false);
    const missing = structuredClone(budget);
    missing.measures.pop();
    expect(budgetScorecardProblems(missing, scorecard).join('\n')).toMatch(/does not list line/);
  });
});
