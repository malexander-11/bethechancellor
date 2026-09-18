import { enterable, type JourneyStep } from '@btc/engine';
import { StepLink } from '../journey/links';
import { useBudget } from '../state/budget';

type Stop = 'start' | 'outlook' | 'pm' | 'budget' | 'forecast' | 'rabbit' | 'budget-day';

/** The seven stops, in order. The desk is one stop with three screens; so are the forecast and the sums. */
const STOPS: ReadonlyArray<{ id: Stop; label: string; to: string; step: JourneyStep }> = [
  { id: 'start', label: 'The appointment', to: '/', step: 'start' },
  { id: 'outlook', label: 'The outlook', to: '/outlook', step: 'outlook' },
  { id: 'pm', label: 'The PM', to: '/pm', step: 'pm' },
  { id: 'budget', label: 'The desk', to: '/budget/taxes', step: 'taxes' },
  { id: 'forecast', label: 'The forecast', to: '/forecast', step: 'forecast' },
  { id: 'rabbit', label: 'The rabbit', to: '/rabbit', step: 'rabbit' },
  { id: 'budget-day', label: 'Budget day', to: '/budget-day', step: 'budget-day' },
];

/** Which stop a step lights up. */
export function stopFor(step: JourneyStep): Stop {
  switch (step) {
    case 'start':
    case 'pm':
    case 'forecast':
    case 'rabbit':
    case 'budget-day':
      return step;
    case 'compromise':
      return 'forecast';
    case 'outlook':
    case 'assumptions':
      return 'outlook';
    default:
      return 'budget';
  }
}

/**
 * The road, drawn: seven numbered stops on a brass rail. A stop you have reached is a quiet link,
 * so you can go back to the desk; the one you are at is marked; the ones ahead are inert. It reads
 * the same `enterable` rule as the guard on every page, so it never offers a link that would only
 * bounce. With no game the guard leaves the desk and Budget day open to a shared link, but the
 * rail still offers nothing ahead of you: the sandbox has its own door on the appointment letter.
 * Numbers stay visible at every width; labels other than the current one go at phone width.
 */
export function ProgressRail({ step }: { step: JourneyStep }) {
  const { state } = useBudget();
  const current = stopFor(step);
  const at = STOPS.findIndex((s) => s.id === current);
  return (
    <nav className="progress" aria-label="Budget steps">
      <ol className="progress__stops">
        {STOPS.map((s, i) => {
          const isCurrent = s.id === current;
          const open =
            !isCurrent && enterable(s.step, state.game) && (state.game !== undefined || i < at);
          const state_ = isCurrent ? 'current' : open ? 'open' : 'ahead';
          const text = (
            <>
              <span className="progress__number" aria-hidden="true">
                {i + 1}
              </span>
              <span className="progress__label">{s.label}</span>
            </>
          );
          return (
            <li key={s.id} className={`progress__stop progress__stop--${state_}`}>
              {isCurrent ? (
                <span aria-current="step">{text}</span>
              ) : open ? (
                <StepLink to={s.to} end={s.id === 'start'}>
                  {text}
                </StepLink>
              ) : (
                <span className="progress__ahead">{text}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
