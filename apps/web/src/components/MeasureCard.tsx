import { formatGbpBn, linesFigure, type BudgetCard, type BudgetMeasure } from '@btc/engine';
import { useEffect, useState } from 'react';
import { measures as measureVotes, type Tally } from '../board/api';
import { deviceCode, measureKey, myVote, rememberVote } from '../board/voter';
import { agreeWords, BOARD_TEXT } from '../board/words';
import { levers, scorecard } from '../data';
import { useMoneyOf } from '../journey/balance';
import { useBudget } from '../state/budget';

/** Whether the public's votes can be counted, and what they stand at when they can. */
export type Voting =
  | { kind: 'unknown' }
  | { kind: 'closed' }
  | { kind: 'down' }
  | { kind: 'open'; tallies: Record<string, Tally> };

/**
 * Whether votes can be counted (ADR-0045), asked once a page: the tallies when the server's
 * database is there, or why not. Nothing is said to the server about the reader.
 */
export function useVoting(): Voting {
  const [voting, setVoting] = useState<Voting>({ kind: 'unknown' });
  useEffect(() => {
    let live = true;
    void measureVotes.tallies().then((answer) => {
      if (!live) return;
      setVoting(
        answer.ok
          ? { kind: 'open', tallies: answer.body.tallies }
          : { kind: answer.error === 'closed' ? 'closed' : 'down' },
      );
    });
    return () => {
      live = false;
    };
  }, []);
  return voting;
}

/** The words that say whether answers are counted as votes, once the page knows. */
export function votingLine(voting: Voting): string | null {
  if (voting.kind === 'open') return BOARD_TEXT.votingLead;
  if (voting.kind === 'closed') return BOARD_TEXT.votingClosed;
  if (voting.kind === 'down') return BOARD_TEXT.votingDown;
  return null;
}

/** A measure's tally: what a vote just sent brought back, or what the page was given. */
function useTally(id: string, voting: Voting) {
  const [cast, setCast] = useState<Tally | undefined>(undefined);
  const given = voting.kind === 'open' ? (voting.tallies[id] ?? { ups: 0, downs: 0 }) : undefined;
  return [cast ?? given, setCast] as const;
}

/** Investment counts against the debt rule: only its interest moves the money (ADR-0046). */
export const INVESTMENT_WORDS =
  'This is investment, which counts against the debt rule. Only its interest moves your money.';

/**
 * A vote cast on every measure a card or a row stands for (ADR-0046): remembered in this browser
 * first, whether or not the server is there, so the walk shows the answer; then sent when voting is
 * open. What comes back is the first measure's tally, or why it could not be counted.
 */
export async function castVote(
  ids: readonly string[],
  value: 1 | -1 | 0,
  voting: Voting,
): Promise<{ tally?: Tally; said: string }> {
  deviceCode();
  for (const id of ids) rememberVote(measureKey(id), value);
  if (voting.kind !== 'open') return { said: '' };
  const answers = await Promise.all(ids.map((id) => measureVotes.vote(id, value)));
  const failed = answers.find((a) => !a.ok);
  if (failed && !failed.ok) {
    return { said: failed.error === 'limit' ? BOARD_TEXT.voteLimited : BOARD_TEXT.voteFailed };
  }
  const first = answers[0];
  return first?.ok
    ? { tally: { ups: first.body.ups, downs: first.body.downs }, said: '' }
    : { said: '' };
}

/** What disagreeing does to a player's money, in words: "Disagreeing costs you £0.5bn." */
export function moneyWords(gbpm: number, year: string): string {
  const size = formatGbpBn(Math.abs(gbpm), 1);
  if (gbpm <= -50) return `Disagreeing costs you ${size}.`;
  if (gbpm >= 50) return `Disagreeing saves you ${size}.`;
  return `Disagreeing changes nothing in ${year}, the year that counts.`;
}

/**
 * One of the Chancellor's decisions on the walk (ADR-0046): what the Chancellor did, what it
 * means, and its figure from the Treasury's scorecard; then Agree or Disagree. Disagreeing takes the
 * measure out of the player's Budget (its lever on), agreeing keeps it; either is the player's vote
 * on each measure the card stands for, and pressing the pressed answer again takes it back. Under
 * the buttons, what disagreeing does to the money, worked out by the engine on the Budget as it
 * stands.
 */
export function MeasureCard({
  card,
  measures,
  year,
  voting,
}: {
  card: BudgetCard;
  measures: readonly BudgetMeasure[];
  year: string;
  voting: Voting;
}) {
  const { state, dispatch } = useBudget();
  const moneyOf = useMoneyOf();
  const ids = measures.map((m) => m.id);
  const first = ids[0] ?? '';
  const [mine, setMine] = useState(() => myVote(measureKey(first)));
  const [tally, setTally] = useTally(first, voting);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);

  const lever = levers.find((l) => l.code === card.lever);
  const disagreed = (state.leverValues[card.lever] ?? 0) !== 0;
  const agreed = !disagreed && mine === 1;
  const figure = linesFigure(
    scorecard,
    measures.map((m) => m.line),
    year,
  );
  // What disagreeing does, measured from agreeing, whichever the Budget holds now.
  const rest = { ...state.leverValues };
  delete rest[card.lever];
  const money = moneyOf({ ...rest, [card.lever]: 1 }) - moneyOf(rest);
  const investment = lever?.classification?.currentOrCapital === 'capital';

  async function answer(value: 1 | -1) {
    const pressed = value === 1 ? agreed : disagreed;
    const next = pressed ? 0 : value;
    // The money follows the answer: disagreeing reverses the measure; anything else keeps it.
    dispatch({ type: 'setLever', code: card.lever, value: next === -1 ? 1 : 0 });
    setMine(next);
    setBusy(true);
    const result = await castVote(ids, next, voting);
    setBusy(false);
    if (result.tally) setTally(result.tally);
    setSaid(result.said);
  }

  const id = `card-${card.lever}`;
  return (
    <li className="mcard" aria-labelledby={id}>
      <h2 id={id} className="mcard__title">
        {card.title}
      </h2>
      <p className="mcard__explain">{card.explain}</p>
      {figure ? <p className="mcard__figure">The Treasury’s figure: {figure.words}.</p> : null}
      <div className="mcard__answer" role="group" aria-label={`Your answer: ${card.title}`}>
        <button
          type="button"
          className="btn mcard__button mcard__button--agree"
          aria-pressed={agreed}
          disabled={busy}
          onClick={() => answer(1)}
        >
          {BOARD_TEXT.agree}
        </button>
        <button
          type="button"
          className="btn mcard__button mcard__button--disagree"
          aria-pressed={disagreed}
          disabled={busy}
          onClick={() => answer(-1)}
        >
          {BOARD_TEXT.disagree}
        </button>
        {tally ? <span className="votes__counts">{agreeWords(tally)}</span> : null}
      </div>
      <p className={`mcard__money${disagreed ? ' mcard__money--chosen' : ''}`}>
        {moneyWords(money, year)}
        {investment ? ` ${INVESTMENT_WORDS}` : ''}
      </p>
      <p role="status" className="votes__said">
        {said}
      </p>
    </li>
  );
}

/**
 * One measure of the small print (ADR-0046): its plain line and a tick or a cross, the player's
 * vote and nothing more, since no lever moves it. Pressing the pressed mark again takes it back.
 */
export function SmallPrintRow({ measure, voting }: { measure: BudgetMeasure; voting: Voting }) {
  const [mine, setMine] = useState(() => myVote(measureKey(measure.id)));
  const [tally, setTally] = useTally(measure.id, voting);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  async function answer(value: 1 | -1) {
    const next = mine === value ? 0 : value;
    setMine(next);
    setBusy(true);
    const result = await castVote([measure.id], next, voting);
    setBusy(false);
    if (result.tally) setTally(result.tally);
    setSaid(result.said);
  }
  const mark = (value: 1 | -1) => (
    <button
      type="button"
      className={`small__mark small__mark--${value === 1 ? 'agree' : 'disagree'}`}
      aria-pressed={mine === value}
      aria-label={`${value === 1 ? BOARD_TEXT.agree : BOARD_TEXT.disagree}: ${measure.plain}`}
      disabled={busy}
      onClick={() => answer(value)}
    >
      <span aria-hidden="true">{value === 1 ? '✓' : '✗'}</span>
    </button>
  );
  return (
    <li className="small__row">
      <span className="small__plain">{measure.plain}</span>
      <span className="small__marks">
        {mark(1)}
        {mark(-1)}
      </span>
      {tally ? <span className="small__counts">{agreeWords(tally)}</span> : null}
      {said ? (
        <span role="status" className="votes__said">
          {said}
        </span>
      ) : null}
    </li>
  );
}
