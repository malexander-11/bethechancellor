import { readFinishedBudget, summariseBudget, summaryWords } from '@btc/engine';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { leaderboard, type Entry } from '../board/api';
import { BOARD_TEXT } from '../board/words';
import { BoardWayOn } from '../components/BoardWayOn';
import { ReportTitle, Votes } from '../components/Votes';
import { gameData } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { usePageTitle } from '../journey/title';

type Sort = 'top' | 'new';

type Listing =
  | { kind: 'loading' }
  | { kind: 'failed'; error: string }
  | { kind: 'open'; entries: Entry[]; more: boolean; loadingMore: boolean };

/** What a line of the leaderboard says of a Budget: its theme, its headroom and the rules. */
function EntryLine({ entry }: { entry: Entry }) {
  const outcomeOf = useOutcomeOf();
  const words = useMemo(() => {
    const budget = readFinishedBudget(gameData, entry.query);
    if (!budget) return null;
    const summary = summariseBudget(gameData, budget, outcomeOf);
    return {
      theme: summaryWords(summary).title,
      line: `${summary.headroomLine} ${summaryWords(summary).rules}`,
    };
  }, [entry.query, outcomeOf]);
  if (!words) return null;
  return (
    <>
      <p className="board__theme">{words.theme}</p>
      <p className="board__line">{words.line}</p>
    </>
  );
}

/**
 * The leaderboard (ADR-0044): Budgets players have put on it under their own titles, by votes or
 * newest, each read again from its link, with a vote for or against and a way to report its title.
 * Its one button leads back to the reader's own game, or into a new one.
 */
export function LeaderboardPage() {
  usePageTitle(BOARD_TEXT.title);
  const [params] = useSearchParams();
  const sort: Sort = params.get('sort') === 'new' ? 'new' : 'top';
  const [listing, setListing] = useState<Listing>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    setListing({ kind: 'loading' });
    void leaderboard.list(sort, 0).then((answer) => {
      if (!live) return;
      setListing(
        answer.ok
          ? {
              kind: 'open',
              entries: answer.body.entries,
              more: answer.body.more,
              loadingMore: false,
            }
          : { kind: 'failed', error: answer.error },
      );
    });
    return () => {
      live = false;
    };
  }, [sort]);

  async function showMore() {
    if (listing.kind !== 'open') return;
    setListing({ ...listing, loadingMore: true });
    const answer = await leaderboard.list(sort, listing.entries.length);
    setListing(
      answer.ok
        ? {
            kind: 'open',
            entries: [...listing.entries, ...answer.body.entries],
            more: answer.body.more,
            loadingMore: false,
          }
        : { ...listing, loadingMore: false },
    );
  }

  const orders: [Sort, string][] = [
    ['top', BOARD_TEXT.top],
    ['new', BOARD_TEXT.newest],
  ];
  return (
    <article className="board">
      <h1>{BOARD_TEXT.title}</h1>
      <p className="lede">{BOARD_TEXT.lead}</p>
      <nav className="board__order" aria-label={BOARD_TEXT.order}>
        {orders.map(([key, words]) => (
          <Link
            key={key}
            to={{ search: `?sort=${key}` }}
            aria-current={sort === key ? 'page' : undefined}
          >
            {words}
          </Link>
        ))}
      </nav>
      {listing.kind === 'loading' ? (
        <p role="status" className="board__note">
          {BOARD_TEXT.loading}
        </p>
      ) : listing.kind === 'failed' ? (
        <p role="status" className="board__note">
          {listing.error === 'closed' ? BOARD_TEXT.closed : BOARD_TEXT.down}
        </p>
      ) : listing.entries.length === 0 ? (
        <p className="board__note">{BOARD_TEXT.empty}</p>
      ) : (
        <>
          <ol className="board__entries">
            {listing.entries.map((entry) => (
              <li key={entry.id} className="board__entry">
                <h2 className="board__title">
                  <Link to={`/leaderboard/${entry.id}`}>{entry.title}</Link>
                </h2>
                <EntryLine entry={entry} />
                <Votes entry={entry} />
                <ReportTitle entry={entry} />
              </li>
            ))}
          </ol>
          {listing.more ? (
            <p>
              <button
                type="button"
                className="btn"
                disabled={listing.loadingMore}
                onClick={showMore}
              >
                {BOARD_TEXT.more}
              </button>
            </p>
          ) : null}
        </>
      )}
      <p className="actions">
        <BoardWayOn />
      </p>
    </article>
  );
}
