import { enterable, type JourneyStep } from '@btc/engine';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

type Stop = 'briefing' | 'pm' | 'flagships' | 'finetune' | 'review' | 'budget-day';

/**
 * The six steps, in order, as the player is told them (Phase 24, ADR-0025), with the short name a
 * wide screen shows under each numeral (Phase 25): the step's own words, cut down, never new ones.
 */
export const STOPS: ReadonlyArray<{
  id: Stop;
  label: string;
  short: string;
  to: string;
  step: JourneyStep;
}> = [
  { id: 'briefing', label: 'Briefing', short: 'Briefing', to: '/outlook', step: 'outlook' },
  { id: 'pm', label: 'Set your priorities', short: 'Priorities', to: '/pm', step: 'pm' },
  {
    id: 'flagships',
    label: 'Flagship policies',
    short: 'Flagships',
    to: '/budget/deliver',
    step: 'deliver',
  },
  {
    id: 'finetune',
    label: 'Fine-tune tax and spend',
    short: 'Fine-tune',
    to: '/finetune/tax',
    step: 'finetune',
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

/** Which step a screen belongs to. The cover shows no road, but it opens the briefing's step. */
export function stopFor(step: JourneyStep): Stop {
  switch (step) {
    case 'start':
    case 'outlook':
    case 'assumptions':
      return 'briefing';
    case 'pm':
      return 'pm';
    case 'deliver':
      return 'flagships';
    case 'finetune':
      return 'finetune';
    case 'review':
      return 'review';
    case 'budget-day':
      return 'budget-day';
  }
}

/** Which screen of a step this is, when a step has more than one: "Fine-tune tax and spend · 2 of 2". */
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
 * The road, as a running head on every screen after the cover (ADR-0033): "Step 2 of 6 · Set your
 * priorities", then six marks on a rule, one per step. The cover is the invitation to play, so it
 * carries none. A step behind you is done: a tick, and a link back to it. The step you are at is a
 * filled numeral, named on the line above it. A step ahead you have already opened is an outlined
 * numeral and a link; one not yet open is a dashed numeral, inert. The tick, the fill and the
 * dashes say which is which, and so does the rule, solid behind you and dashed ahead, so nothing
 * rests on colour; a screen reader hears each step's full name and whether it is done. It reads the
 * same `enterable` rule as the guard on every page, so it never offers a link that would only
 * bounce (ADR-0014).
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
          // The mark and, on a wide screen, the step's short name; a screen reader hears the full
          // name once, below.
          const mark = (
            <>
              <span className="progress__num" aria-hidden="true">
                {kind === 'done' ? <Tick /> : i + 1}
              </span>
              <span className="progress__label" aria-hidden="true">
                {s.short}
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
