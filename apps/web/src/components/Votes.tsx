import { useState } from 'react';
import { leaderboard, type Entry } from '../board/api';
import { hasReported, myVote, rememberReport, rememberVote } from '../board/voter';
import { BOARD_TEXT, countsWords } from '../board/words';

/**
 * An entry's votes (ADR-0044): a button for and a button against, each pressed while it is this
 * browser's vote and pressed again to take it back, and the counts in words. One vote a device;
 * what the server counts is what is shown.
 */
export function Votes({ entry }: { entry: Entry }) {
  const [counts, setCounts] = useState({ ups: entry.ups, downs: entry.downs });
  const [mine, setMine] = useState(() => myVote(entry.id));
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  async function cast(value: 1 | -1) {
    const next = mine === value ? 0 : value;
    setBusy(true);
    const answer = await leaderboard.vote(entry.id, next);
    setBusy(false);
    if (!answer.ok) {
      setSaid(answer.error === 'limit' ? BOARD_TEXT.voteLimited : BOARD_TEXT.voteFailed);
      return;
    }
    setCounts({ ups: answer.body.ups, downs: answer.body.downs });
    setMine(next);
    rememberVote(entry.id, next);
    setSaid('');
  }

  const button = (value: 1 | -1, mark: string, words: string) => (
    <button
      type="button"
      className={`btn votes__button votes__button--${value === 1 ? 'for' : 'against'}`}
      aria-pressed={mine === value}
      disabled={busy}
      onClick={() => cast(value)}
    >
      <span aria-hidden="true">{mark}</span> {words}
      <span className="sr-only"> “{entry.title}”</span>
    </button>
  );
  return (
    <div className="votes">
      {button(1, '▲', BOARD_TEXT.voteFor)}
      {button(-1, '▼', BOARD_TEXT.voteAgainst)}
      <span className="votes__counts">{countsWords(counts)}</span>
      <span role="status" className="votes__said">
        {said}
      </span>
    </div>
  );
}

/**
 * Reporting an entry's title to the owner: once a browser. Reports from three networks hide it
 * until the owner looks; the reporter is thanked either way.
 */
export function ReportTitle({ entry }: { entry: Entry }) {
  const [reported, setReported] = useState(() => hasReported(entry.id));
  const [said, setSaid] = useState('');
  async function report() {
    const answer = await leaderboard.report(entry.id);
    if (!answer.ok) {
      setSaid(BOARD_TEXT.reportFailed);
      return;
    }
    rememberReport(entry.id);
    setReported(true);
    setSaid(BOARD_TEXT.reportThanks);
  }
  return (
    <p className="report">
      <button type="button" className="linklike" disabled={reported} onClick={report}>
        {reported ? BOARD_TEXT.reported : BOARD_TEXT.report}
        <span className="sr-only"> “{entry.title}”</span>
      </button>{' '}
      <span role="status" className="report__said">
        {said}
      </span>
    </p>
  );
}
