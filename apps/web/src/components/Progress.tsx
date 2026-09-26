import { enterable, type JourneyStep } from '@btc/engine';
import { dateFor } from '../data';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';
import { Dateline } from './Dateline';

type Stop = 'start' | 'outlook' | 'pm' | 'budget' | 'forecast' | 'final' | 'budget-day';

/** The seven steps, in order, as the player is told them. */
export const STOPS: ReadonlyArray<{ id: Stop; label: string; to: string; step: JourneyStep }> = [
  { id: 'start', label: 'Become Chancellor', to: '/', step: 'start' },
  { id: 'outlook', label: 'Your starting position', to: '/outlook', step: 'outlook' },
  { id: 'pm', label: 'Set your priorities', to: '/pm', step: 'pm' },
  { id: 'budget', label: 'Build your Budget', to: '/budget/deliver', step: 'deliver' },
  { id: 'forecast', label: 'Respond to the forecast', to: '/forecast', step: 'forecast' },
  { id: 'final', label: 'Final choices', to: '/rabbit', step: 'rabbit' },
  { id: 'budget-day', label: 'What your Budget means', to: '/budget-day', step: 'budget-day' },
];

/** Which step a screen belongs to. */
export function stopFor(step: JourneyStep): Stop {
  switch (step) {
    case 'start':
    case 'pm':
    case 'forecast':
    case 'budget-day':
      return step;
    case 'rabbit':
    case 'review':
      return 'final';
    case 'compromise':
      return 'forecast';
    case 'outlook':
    case 'assumptions':
      return 'outlook';
    default:
      return 'budget';
  }
}

/** Which screen of a step this is, when a step has more than one: "Build your Budget · 2 of 4". */
export interface SubStep {
  index: number;
  total: number;
  /** What this screen is, for the browser tab. */
  label: string;
  /** Kept for the pages that still name their part; the bar no longer says it. */
  noun?: string;
}

/**
 * The road, as one line and a bar: "Step 3 of 7 · Set your priorities", the in-game date, and
 * seven segments, one per step. A step you have reached is a link, so you can go back; the one
 * you are at is marked; the ones ahead are inert. It reads the same `enterable` rule as the guard
 * on every page, so it never offers a link that would only bounce (ADR-0014). The segments carry
 * their names for a screen reader; sighted readers get the name of the step they are on.
 */
export function Progress({ step, part }: { step: JourneyStep; part?: SubStep }) {
  const { state } = useBudget();
  const current = stopFor(step);
  const at = STOPS.findIndex((s) => s.id === current);
  const here = STOPS[at];
  return (
    <nav className="progress" aria-label="Budget steps">
      <div className="progress__line">
        <p className="progress__where">
          <span className="progress__step">
            Step {at + 1} of {STOPS.length}
          </span>
          <span className="progress__name">
            {here?.label}
            {part ? ` · ${part.index} of ${part.total}` : ''}
          </span>
        </p>
        <Dateline now={dateFor(step)} />
      </div>
      <ol className="progress__stops">
        {STOPS.map((s, i) => {
          const isCurrent = s.id === current;
          const open =
            !isCurrent && enterable(s.step, state.game) && (state.game !== undefined || i < at);
          const kind = isCurrent ? 'current' : open ? 'open' : 'ahead';
          const name = (
            <span className="sr-only">
              {i + 1}. {s.label}
              {kind === 'ahead' ? ' (not yet open)' : ''}
            </span>
          );
          return (
            <li key={s.id} className={`progress__stop progress__stop--${kind}`}>
              {isCurrent ? (
                <span aria-current="step">{name}</span>
              ) : open ? (
                <StepLink to={s.to} end={s.id === 'start'}>
                  {name}
                </StepLink>
              ) : (
                <span className="progress__ahead">{name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
