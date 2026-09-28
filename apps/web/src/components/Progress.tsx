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

/** Which step a screen belongs to. The cover is the briefing's. */
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

/**
 * The road, as a running head: "Step 2 of 6 · Set your priorities" and six numerals on a
 * rule, one per step. A step you have reached is a link, so you can go back; the one
 * you are at is marked; the ones ahead are inert. It reads the same `enterable` rule as the guard
 * on every page, so it never offers a link that would only bounce (ADR-0014). The numerals carry
 * their names for a screen reader; sighted readers get the name of the step they are on.
 */
export function Progress({
  step,
  part,
  named = false,
}: {
  step: JourneyStep;
  part?: SubStep;
  /** Name the step on the line too: for a screen whose own heading is not the step's name. */
  named?: boolean;
}) {
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
          {named ? (
            <span className="progress__name">
              {here?.label}
              {part ? ` · ${part.index} of ${part.total}` : ''}
            </span>
          ) : null}
        </p>
      </div>
      <ol className="progress__stops">
        {STOPS.map((s, i) => {
          const isCurrent = s.id === current;
          const open =
            !isCurrent && enterable(s.step, state.game) && (state.game !== undefined || i < at);
          const kind = isCurrent ? 'current' : open ? 'open' : 'ahead';
          // The numeral and, on a wide screen, the step's short name; a screen reader hears the
          // full name once, below.
          const num = (
            <>
              <span className="progress__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="progress__label" aria-hidden="true">
                {s.short}
              </span>
            </>
          );
          const name = (
            <span className="sr-only">
              {i + 1}. {s.label}
              {kind === 'ahead' ? ' (not yet open)' : ''}
            </span>
          );
          return (
            <li key={s.id} className={`progress__stop progress__stop--${kind}`}>
              {isCurrent ? (
                <span aria-current="step">
                  {num}
                  {name}
                </span>
              ) : open ? (
                <StepLink to={s.to}>
                  {num}
                  {name}
                </StepLink>
              ) : (
                <span className="progress__ahead">
                  {num}
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
