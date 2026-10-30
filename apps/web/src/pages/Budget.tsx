import {
  fillStory,
  formatGbpBn,
  measureFigure,
  type BudgetMeasure,
  type MeasureGroup,
} from '@btc/engine';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BOARD_TEXT } from '../board/words';
import { JourneyLayout } from '../components/JourneyLayout';
import { budget, levers, scorecard } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { usePageTitle } from '../journey/title';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

/** The page's own words (ADR-0045): what is not the data's or the engine's. */
export const BUDGET_TEXT = {
  story: 'What the Chancellor did',
  measures: 'The measures',
  measuresLead:
    'The ones you can change, by what each does in {year}. Change it opens the screen it is on.',
  groups: {
    taxRise: 'Tax rises',
    taxCut: 'Tax cuts',
    lessSpending: 'Less spending',
    moreSpending: 'More spending',
  } satisfies Record<MeasureGroup, string>,
  change: 'Change it',
  rest: 'Everything else in the Budget',
  restLead: 'Smaller lines, and the ones already over or not yours to move.',
  start: 'Change the Chancellor’s Budget',
  startLead:
    'Start from what the Chancellor did, change what you would, and see what the country makes of it.',
} as const;

/** The code of a measure's lever, and which fine-tuning screen it is on. */
function screenOf(code: string): string {
  const lever = levers.find((l) => l.code === code);
  return lever?.category === 'tax' ? '/finetune/tax' : '/finetune/spending';
}

/**
 * The Budget of 28 October 2026 (ADR-0045): what the Chancellor did, in the game's plain words,
 * with every figure read from the Treasury's own scorecard or worked out by the engine on the
 * OBR's forecast; and the one button that starts a game from it. The story's figures are the
 * engine's where it has them (the headroom, the welfare cap's gap, what the measures do by the
 * target year) and the Budget file's published facts for the rest; nothing on the page is typed.
 * The measures a player can change come first, grouped by what each does by the target year, each
 * with a way to the screen its lever is on; the rest wait in one fold.
 */
export function BudgetPage() {
  const { state, dispatch } = useBudget();
  const outcomeOf = useOutcomeOf();
  const navigate = useNavigate();
  usePageTitle(budget.title);
  // The Chancellor's Budget is the forecast with nothing moved: the engine's own verdicts on it.
  const base = useMemo(() => outcomeOf({}), [outcomeOf]);
  const stability = base.verdicts.find((v) => v.kind === 'currentBudget');
  const welfare = base.verdicts.find((v) => v.kind === 'welfareCap');
  const year = stability?.targetYear ?? '';
  const money = (gbpm: number) => formatGbpBn(Math.abs(gbpm), 1);
  // What the measures do by the target year, from the scorecard's own lines: positive reduces
  // borrowing, so a tax total above nought is money raised and a spending total below it money spent.
  const totals = scorecard.measures.reduce(
    (acc, m) => {
      const v = m.values[year] ?? 0;
      if (m.type === 'Tax') acc.tax += v;
      else acc.spending += v;
      return acc;
    },
    { tax: 0, spending: 0 },
  );
  const f = budget.facts;
  const fills = {
    march: money(f.headroomInMarchGbpm.gbpm),
    debtInterest: money(f.debtInterestSinceMarchGbpm.gbpm),
    other: money(f.otherChangesSinceMarchGbpm.gbpm),
    before: money(f.headroomBeforeMeasuresGbpm.gbpm),
    measures: money(f.measuresOnCurrentBudgetGbpm.gbpm),
    headroom: money(stability?.headroomGbpm ?? 0),
    year,
    welfareGap: money(welfare?.headroomGbpm ?? 0),
    tax: money(totals.tax),
    spending: money(totals.spending),
  };
  // Every measure with its figure, the movable ones grouped by what each does.
  const figured = budget.measures.map((m) => ({
    measure: m,
    figure: measureFigure(scorecard, m, year),
  }));
  const movable = figured.filter((x) => x.measure.leverCode !== undefined);
  const rest = figured.filter((x) => x.measure.leverCode === undefined);
  const groups = (Object.keys(BUDGET_TEXT.groups) as MeasureGroup[]).map((group) => ({
    group,
    items: movable.filter((x) => x.figure?.group === group),
  }));

  /** The one way in: the game starts from the Chancellor's Budget, a link's measures in it. */
  const begin = (to: string) => {
    const started = reducer(state, { type: 'startGame' });
    dispatch({ type: 'startGame' });
    navigate({ pathname: to, search: `?${permalinkQuery(started)}` });
  };

  const row = ({
    measure,
    figure,
  }: {
    measure: BudgetMeasure;
    figure: ReturnType<typeof measureFigure>;
  }) => (
    <li key={measure.id} className="measure">
      <span className="measure__plain">{measure.plain}</span>{' '}
      {figure ? <span className="measure__figure">{figure.words}</span> : null}
      {measure.notMovable ? (
        <span className="measure__why"> {measure.notMovable.reason}</span>
      ) : null}
      {measure.leverCode ? (
        <>
          {' '}
          <button
            type="button"
            className="linklike measure__change"
            onClick={() => begin(screenOf(measure.leverCode ?? ''))}
          >
            {BUDGET_TEXT.change}
            <span className="sr-only">: {measure.plain}</span>
          </button>
        </>
      ) : null}
    </li>
  );

  return (
    <JourneyLayout step="start" intro={false}>
      <header className="intro">
        <h1 className="intro__title">{budget.title}</h1>
        <p className="intro__lead">
          The Chancellor, {budget.chancellor.name}, delivered it. Here is what it did, and what it
          leaves.
        </p>
      </header>

      <section className="doc" aria-labelledby="story-heading">
        <h2 id="story-heading" className="section-label">
          {BUDGET_TEXT.story}
        </h2>
        {budget.story.map((line) => (
          <p key={line.text}>{fillStory(line.text, fills)}</p>
        ))}
      </section>

      <section className="doc" aria-labelledby="measures-heading">
        <h2 id="measures-heading" className="section-label">
          {BUDGET_TEXT.measures}
        </h2>
        <p className="panel__hint">{BUDGET_TEXT.measuresLead.replace('{year}', year)}</p>
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.group} aria-labelledby={`measures-${g.group}`}>
              <h3 id={`measures-${g.group}`} className="measures__group">
                {BUDGET_TEXT.groups[g.group]}
              </h3>
              <ul className="measures">{g.items.map(row)}</ul>
            </section>
          ))}
        <details className="more more--quiet">
          <summary>{BUDGET_TEXT.rest}</summary>
          <div className="more__body">
            <p className="panel__hint">{BUDGET_TEXT.restLead}</p>
            <ul className="measures">{rest.map(row)}</ul>
          </div>
        </details>
      </section>

      <p className="panel__hint">{BUDGET_TEXT.startLead}</p>
      <p className="actions">
        <button
          type="button"
          className="btn btn--primary btn--big"
          onClick={() => begin('/finetune/tax')}
        >
          {BUDGET_TEXT.start}
        </button>
      </p>
      {/* A quiet second way in (ADR-0044): what other players made. */}
      <p className="budget__more">
        <Link to="/leaderboard">{BOARD_TEXT.see}</Link>
      </p>
    </JourneyLayout>
  );
}
