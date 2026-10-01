import { PICTURE_SIZE, readFinishedBudget, summariseBudget, summaryWords } from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { leaderboard, type Entry } from '../board/api';
import { BOARD_TEXT } from '../board/words';
import { BoardWayOn } from '../components/BoardWayOn';
import { BudgetFacts } from '../components/BudgetFacts';
import { ReportTitle, Votes } from '../components/Votes';
import { gameData } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { usePageTitle } from '../journey/title';
import { SHARE_TEXT } from '../share/words';
import { useBudget } from '../state/budget';

type Found =
  { kind: 'loading' } | { kind: 'failed'; error: string } | { kind: 'found'; entry: Entry };

/**
 * One entry on the leaderboard (ADR-0044): the player's title, the Budget's theme and picture, the
 * votes and the report, the way on and the way into the Budget itself, then the Budget in words.
 */
export function LeaderboardEntryPage() {
  const { id = '' } = useParams();
  const { dispatch } = useBudget();
  const outcomeOf = useOutcomeOf();
  const [found, setFound] = useState<Found>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setFound({ kind: 'loading' });
    void leaderboard.entry(id).then((answer) => {
      if (!live) return;
      setFound(
        answer.ok
          ? { kind: 'found', entry: answer.body.entry }
          : { kind: 'failed', error: answer.error },
      );
    });
    return () => {
      live = false;
    };
  }, [id]);

  const entry = found.kind === 'found' ? found.entry : null;
  const read = useMemo(() => {
    const budget = entry ? readFinishedBudget(gameData, entry.query) : null;
    return budget ? { budget, summary: summariseBudget(gameData, budget, outcomeOf) } : null;
  }, [entry, outcomeOf]);
  usePageTitle(entry?.title ?? (found.kind === 'loading' ? undefined : BOARD_TEXT.missing));

  const see = (
    <p className="board__see">
      <Link to="/leaderboard">{BOARD_TEXT.see}</Link>
    </p>
  );
  if (found.kind === 'loading') {
    return (
      <article className="shared">
        <p role="status" className="board__note">
          {BOARD_TEXT.loading}
        </p>
      </article>
    );
  }
  if (!entry || !read) {
    const error = found.kind === 'failed' ? found.error : 'missing';
    return (
      <article className="shared">
        <h1>{error === 'closed' ? BOARD_TEXT.title : BOARD_TEXT.missing}</h1>
        <p className="lede">
          {error === 'closed'
            ? BOARD_TEXT.closed
            : error === 'down'
              ? BOARD_TEXT.down
              : BOARD_TEXT.missingLead}
        </p>
        <p className="actions">
          <BoardWayOn />
        </p>
        {see}
      </article>
    );
  }

  const { budget, summary } = read;
  async function copyLink() {
    const url = `${window.location.origin}/leaderboard/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      window.prompt(BOARD_TEXT.copy, url);
    }
  }
  return (
    <article className="shared">
      <p className="kicker">{BOARD_TEXT.kicker}</p>
      <h1>{entry.title}</h1>
      <p className="lede">{summaryWords(summary).title}</p>
      {/* The picture its preview showed; the words below say all of it, so it is not read out. */}
      <img
        className="share__picture"
        src={`/api/card?${budget.query}`}
        alt=""
        width={PICTURE_SIZE.width}
        height={PICTURE_SIZE.height}
      />
      <Votes entry={entry} />
      <ReportTitle entry={entry} />
      <p className="actions">
        <BoardWayOn />
        <Link
          to={{ pathname: '/budget-day', search: `?${budget.query}` }}
          className="btn"
          onClick={() => dispatch({ type: 'load', search: budget.query })}
        >
          {SHARE_TEXT.open}
        </Link>
        <button type="button" className="btn" onClick={copyLink}>
          {BOARD_TEXT.copy}
        </button>
        <span role="status" className="actions__hint">
          {copied ? BOARD_TEXT.copied : ''}
        </span>
      </p>
      <BudgetFacts
        summary={summary}
        headings={{ sides: SHARE_TEXT.sides, verdict: SHARE_TEXT.verdict }}
      />
      {see}
    </article>
  );
}
