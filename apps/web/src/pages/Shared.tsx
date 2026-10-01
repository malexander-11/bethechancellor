import { PICTURE_SIZE, readFinishedBudget, summariseBudget, summaryWords } from '@btc/engine';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BudgetFacts } from '../components/BudgetFacts';
import { gameData } from '../data';
import { StepLink } from '../journey/links';
import { useOutcomeOf } from '../journey/outcome';
import { usePageTitle } from '../journey/title';
import { SHARE_TEXT } from '../share/words';
import { useBudget } from '../state/budget';

/**
 * The page a shared link opens (ADR-0044): someone's finished Budget, read from the link and worked
 * out again, as the picture its preview showed and in words; then the invitation to make one's own,
 * which is the point of sharing it. Its link names a Budget the reader has not taken up, so the
 * reader's own game is untouched until they open this one in it.
 */
export function SharedPage() {
  const { search } = useLocation();
  const { dispatch } = useBudget();
  const outcomeOf = useOutcomeOf();
  const shared = useMemo(() => {
    const budget = readFinishedBudget(gameData, search);
    return budget ? { budget, summary: summariseBudget(gameData, budget, outcomeOf) } : null;
  }, [search, outcomeOf]);
  const words = shared ? summaryWords(shared.summary) : null;
  usePageTitle(words?.title ?? SHARE_TEXT.missing);

  const play = (
    <StepLink to="/outlook" className="btn btn--primary">
      {SHARE_TEXT.play}
    </StepLink>
  );
  if (!shared || !words) {
    return (
      <article className="shared">
        <h1>{SHARE_TEXT.missing}</h1>
        <p className="lede">{SHARE_TEXT.missingLead}</p>
        <p className="actions">{play}</p>
      </article>
    );
  }
  const { budget, summary } = shared;
  return (
    <article className="shared">
      <p className="kicker">{SHARE_TEXT.kicker}</p>
      <h1>{words.title}</h1>
      <p className="lede">{SHARE_TEXT.lead}</p>
      {/* The picture its preview showed; the words below say all of it, so it is not read out. */}
      <img
        className="share__picture"
        src={`/api/card?${budget.query}`}
        alt=""
        width={PICTURE_SIZE.width}
        height={PICTURE_SIZE.height}
      />
      <p className="actions">
        {play}
        <Link
          to={{ pathname: '/budget-day', search: `?${budget.query}` }}
          className="btn"
          onClick={() => dispatch({ type: 'load', search: budget.query })}
        >
          {SHARE_TEXT.open}
        </Link>
      </p>
      <BudgetFacts
        summary={summary}
        headings={{ sides: SHARE_TEXT.sides, verdict: SHARE_TEXT.verdict }}
      />
    </article>
  );
}
