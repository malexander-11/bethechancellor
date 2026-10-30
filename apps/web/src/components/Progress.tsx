import { enterable, type JourneyStep } from '@btc/engine';
import { StepLink } from '../journey/links';
import { STAGE_ROUTES } from '../journey/routes';
import { useBudget } from '../state/budget';

type Stop = 'measures' | 'balance' | 'review' | 'budget-day';

/**
 * The four steps, in order, as the player is told them (ADR-0046), with the short name a wide
 * screen shows under each numeral (Phase 25): the step's own words, cut down, never new ones.
 */
export const STOPS: ReadonlyArray<{
  id: Stop;
  label: string;
  short: string;
  to: string;
  step: JourneyStep;
}> = [
  {
    id: 'measures',
    label: 'The Chancellor’s measures',
    short: 'Measures',
    to: STAGE_ROUTES.measures,
    step: 'measures',
  },
  {
    id: 'balance',
    label: 'Balance your Budget',
    short: 'Balance',
    to: '/balance',
    step: 'balance',
  },
  { id: 'review', label: 'Deliver the Budget', short: 'Deliver', to: '/review', step: 'review' },
  {
    id: 'budget-day',
    label: 'Feedback',
    short: 'Feedback',
    to: '/budget-day',
    step: 'budget-day',
  },
];

/** Which step a screen belongs to. The Chancellor's Budget shows no road, but it opens the first step. */
export function stopFor(step: JourneyStep): Stop {
  switch (step) {
    case 'start':
    case 'measures':
      return 'measures';
    case 'balance':
      return 'balance';
    case 'review':
      return 'review';
    case 'budget-day':
      return 'budget-day';
  }
}

/** Which page of a step this is, when a step has more than one: "The Chancellor’s measures · 2 of 7". */
export interface SubStep {
  index: number;
  total: number;
  /** What this screen is, for the browser tab. */
  label: string;
}

/** A tick, drawn: the mark of a step behind you, in place of its numeral. */
function Tick() {
  return (
    <svg className="progress__tick" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.25" />
    </svg>
  );
}

type StopKind = 'done' | 'current' | 'open' | 'ahead';

/** What a screen reader hears after a step's name; the step you are at says so by aria-current. */
const HEARD: Record<StopKind, string> = {
  done: ' (done)',
  current: '',
  open: '',
  ahead: ' (not yet open)',
};

/**
 * The road, as a running head on every screen of the game (ADR-0033, ADR-0047): "Step 3 of 4 ·
 * Deliver the Budget", then four segments, one per step, that fill as the player goes, each over
 * its mark. A step behind you is done: a full segment, a tick, and a link back to it. The step you
 * are at is a filled numeral, its segment filled as far as its pages have gone, and named on the
 * line above. A step ahead you have already opened is an outlined numeral and a link; one not yet
 * open is a dashed numeral, inert. The tick, the fill and the dashes say which is which, so
 * nothing rests on colour; a screen reader hears each step's full name and whether it is done. It
 * reads the same `enterable` rule as the guard on every page, so it never offers a link that
 * would only bounce (ADR-0014).
 */
export function Progress({ step, part }: { step: JourneyStep; part?: SubStep }) {
  const { state } = useBudget();
  const current = stopFor(step);
  const at = STOPS.findIndex((s) => s.id === current);
  const here = STOPS[at];
  // The furthest step the game has opened: the steps short of it were finished on the way there.
  const reached = state.game?.reached ?? 0;
  return (
    <nav className="progress" aria-label="Budget steps">
      <p className="progress__where">
        <span className="progress__step">
          Step {at + 1} of {STOPS.length}
        </span>{' '}
        <span className="progress__name">
          {here?.label}
          {part ? ` · ${part.index} of ${part.total}` : ''}
        </span>
      </p>
      <ol className="progress__stops">
        {STOPS.map((s, i) => {
          const isCurrent = i === at;
          const open =
            !isCurrent && enterable(s.step, state.game) && (state.game !== undefined || i < at);
          const kind: StopKind = isCurrent
            ? 'current'
            : open && (i < at || i < reached)
              ? 'done'
              : open
                ? 'open'
                : 'ahead';
          // How far the segment fills (ADR-0047): a step behind you in full, the step you are on
          // as far as its pages have gone, the road ahead not at all.
          const fill = kind === 'done' ? 1 : isCurrent ? (part ? part.index / part.total : 1) : 0;
          // The segment, the mark and, on a wide screen, the step's short name; a screen reader
          // hears the full name once, below.
          const mark = (
            <>
              <span className="progress__bar" aria-hidden="true">
                <span className="progress__fill" style={{ inlineSize: `${fill * 100}%` }} />
              </span>
              <span className="progress__mark">
                <span className="progress__num" aria-hidden="true">
                  {kind === 'done' ? <Tick /> : i + 1}
                </span>
                <span className="progress__label" aria-hidden="true">
                  {s.short}
                </span>
              </span>
            </>
          );
          const name = (
            <span className="sr-only">
              {i + 1}. {s.label}
              {HEARD[kind]}
            </span>
          );
          return (
            <li key={s.id} className={`progress__stop progress__stop--${kind}`}>
              {isCurrent ? (
                <span aria-current="step">
                  {mark}
                  {name}
                </span>
              ) : open ? (
                <StepLink to={s.to}>
                  {mark}
                  {name}
                </StepLink>
              ) : (
                <span className="progress__ahead">
                  {mark}
                  {name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
