import { useState } from 'react';
import { measures, type Tally } from '../board/api';
import { measureKey, myVote, rememberVote } from '../board/voter';
import { BOARD_TEXT, countsWords } from '../board/words';

/**
 * The public's vote on one of the Chancellor's measures (ADR-0045): For and Against, each pressed
 * while it is this browser's vote and pressed again to take it back, and the counts in words. One
 * vote a device, as on the leaderboard; what the server counts is what is shown.
 */
export function MeasureVotes({ id, plain, tally }: { id: string; plain: string; tally: Tally }) {
  const [counts, setCounts] = useState(tally);
  const [mine, setMine] = useState(() => myVote(measureKey(id)));
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  async function cast(value: 1 | -1) {
    const next = mine === value ? 0 : value;
    setBusy(true);
    const answer = await measures.vote(id, next);
    setBusy(false);
    if (!answer.ok) {
      setSaid(answer.error === 'limit' ? BOARD_TEXT.voteLimited : BOARD_TEXT.voteFailed);
      return;
    }
    setCounts({ ups: answer.body.ups, downs: answer.body.downs });
    setMine(next);
    rememberVote(measureKey(id), next);
    setSaid('');
  }

  const button = (value: 1 | -1, words: string) => (
    <button
      type="button"
      className={`btn votes__button votes__button--${value === 1 ? 'for' : 'against'}`}
      aria-pressed={mine === value}
      disabled={busy}
      onClick={() => cast(value)}
    >
      {words}
      <span className="sr-only">: {plain}</span>
    </button>
  );
  return (
    <div className="votes measure__votes">
      {button(1, BOARD_TEXT.measureFor)}
      {button(-1, BOARD_TEXT.measureAgainst)}
      <span className="votes__counts">{countsWords(counts)}</span>
      <span role="status" className="votes__said">
        {said}
      </span>
    </div>
  );
}
