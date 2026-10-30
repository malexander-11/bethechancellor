import { fillStory, formatGbpBn, smallPrint } from '@btc/engine';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BOARD_TEXT } from '../board/words';
import { JourneyLayout } from '../components/JourneyLayout';
import { budget, scorecard } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { measuresPath, SMALL_PRINT, STAGE_ROUTES } from '../journey/routes';
import { usePageTitle } from '../journey/title';
import { permalinkQuery, reducer, useBudget } from '../state/budget';

/** The page's own words (ADR-0045, ADR-0046): what is not the data's or the engine's. */
export const BUDGET_TEXT = {
  story: 'What the Chancellor did',
  themes: 'Have your say',
  themesLead:
    'Go through the measures theme by theme, and agree or disagree with each one. Then spend what you saved, or find what you gave up.',
  count: '{n} measures',
  rest: 'The rest of the Budget',
  restCount: '{n} smaller measures to tick or cross',
  start: 'Go through the measures',
} as const;

/**
 * The Budget of 28 October 2026 (ADR-0045): what the Chancellor did, in the game's plain words,
 * with every figure read from the Treasury's own scorecard or worked out by the engine on the
 * OBR's forecast; nothing on the page is typed. Then the walk ahead, theme by theme (ADR-0046),
 * each a way straight in, and the one button that starts a game from the Chancellor's Budget at
 * the first theme, a link's measures in it.
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

  /** The one way in: the game starts from the Chancellor's Budget, a link's measures in it. */
  const begin = (to: string) => {
    const started = reducer(state, { type: 'startGame' });
    dispatch({ type: 'startGame' });
    navigate({ pathname: to, search: `?${permalinkQuery(started)}` });
  };

  const way = (page: string, title: string, count: string) => (
    <li key={page} className="themes__item">
      <button
        type="button"
        className="linklike themes__go"
        onClick={() => begin(measuresPath(page))}
      >
        {title}
      </button>{' '}
      <span className="themes__count">{count}</span>
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

      <section className="doc" aria-labelledby="themes-heading">
        <h2 id="themes-heading" className="section-label">
          {BUDGET_TEXT.themes}
        </h2>
        <p className="panel__hint">{BUDGET_TEXT.themesLead}</p>
        <ul className="themes">
          {budget.themes.map((t) =>
            way(t.id, t.title, BUDGET_TEXT.count.replace('{n}', String(t.cards.length))),
          )}
          {way(
            SMALL_PRINT,
            BUDGET_TEXT.rest,
            BUDGET_TEXT.restCount.replace('{n}', String(smallPrint(budget).length)),
          )}
        </ul>
      </section>

      <p className="actions">
        <button
          type="button"
          className="btn btn--primary btn--big"
          onClick={() => begin(STAGE_ROUTES.measures)}
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
