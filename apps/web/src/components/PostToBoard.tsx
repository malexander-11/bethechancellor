import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { leaderboard, type Entry } from '../board/api';
import { BOARD_TEXT, TITLE_MAX, TITLE_REFUSED } from '../board/words';
import { useSharedBudget } from '../share/finished';

/** Whether the leaderboard is open; unknown until the server says. */
function useBoardOpen(): boolean | undefined {
  const [open, setOpen] = useState<boolean>();
  useEffect(() => {
    let live = true;
    void leaderboard.open().then((answer) => {
      if (live) setOpen(answer);
    });
    return () => {
      live = false;
    };
  }, []);
  return open;
}

type Outcome =
  | { kind: 'idle' }
  | { kind: 'posting' }
  | { kind: 'posted'; entry: Entry; created: boolean }
  /** The title was refused: the field is marked and focused, and says why. */
  | { kind: 'refused'; said: string }
  | { kind: 'failed'; said: string };

/**
 * Budget day's way onto the leaderboard (ADR-0044), shown once it is open: a title for the Budget,
 * checked by the server, and each outcome said in one line that a screen reader hears. The
 * Budget posted is the one shared, read again by the server from its link.
 */
export function PostToBoard() {
  const shared = useSharedBudget();
  const open = useBoardOpen();
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  if (!shared || !open) return null;
  const query = shared.budget.query;

  async function post(event: FormEvent) {
    event.preventDefault();
    setOutcome({ kind: 'posting' });
    const answer = await leaderboard.post(query, title);
    if (answer.ok) {
      setOutcome({ kind: 'posted', entry: answer.body.entry, created: answer.body.created });
      return;
    }
    if (answer.error === 'title') {
      setOutcome({
        kind: 'refused',
        said: TITLE_REFUSED[answer.reason ?? ''] ?? TITLE_REFUSED.empty ?? '',
      });
      field.current?.focus();
      return;
    }
    const said =
      answer.error === 'hidden'
        ? BOARD_TEXT.takenDown
        : answer.error === 'limit'
          ? BOARD_TEXT.postLimited
          : answer.error === 'closed'
            ? BOARD_TEXT.closed
            : BOARD_TEXT.down;
    setOutcome({ kind: 'failed', said });
  }

  const said =
    outcome.kind === 'posted'
      ? outcome.created
        ? BOARD_TEXT.posted
        : BOARD_TEXT.already.replace('{title}', outcome.entry.title)
      : outcome.kind === 'refused' || outcome.kind === 'failed'
        ? outcome.said
        : '';
  return (
    <section className="post" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="section-label">
        {BOARD_TEXT.postHeading}
      </h2>
      {outcome.kind === 'posted' ? null : (
        <form className="post__form" onSubmit={post} noValidate>
          <label htmlFor={`${id}-title`} className="post__label">
            {BOARD_TEXT.postLabel}
          </label>
          <p id={`${id}-hint`} className="post__hint">
            {BOARD_TEXT.postHint}
          </p>
          <div className="post__row">
            <input
              id={`${id}-title`}
              ref={field}
              className="post__input"
              type="text"
              name="title"
              maxLength={TITLE_MAX}
              autoComplete="off"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-describedby={`${id}-hint ${id}-said`}
              aria-invalid={outcome.kind === 'refused' ? true : undefined}
            />
            <button type="submit" className="btn" disabled={outcome.kind === 'posting'}>
              {outcome.kind === 'posting' ? BOARD_TEXT.posting : BOARD_TEXT.postButton}
            </button>
          </div>
        </form>
      )}
      <p
        id={`${id}-said`}
        role="status"
        className={outcome.kind === 'refused' ? 'post__said post__said--refused' : 'post__said'}
      >
        {said}
        {outcome.kind === 'posted' ? (
          <>
            {' '}
            <Link to={`/leaderboard/${outcome.entry.id}`}>{BOARD_TEXT.seeEntry}</Link>
          </>
        ) : null}
      </p>
      {outcome.kind === 'posted' ? null : (
        <p className="post__see">
          <Link to="/leaderboard">{BOARD_TEXT.see}</Link>
        </p>
      )}
    </section>
  );
}
