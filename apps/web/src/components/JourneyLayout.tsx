import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { Dateline } from './Dateline';
import { dateFor } from '../data';
import { StepLink } from '../journey/links';

const STEPS: Array<{
  id: 'start' | 'assumptions' | 'budget' | 'recommendations' | 'budget-day';
  label: string;
  to: string;
}> = [
  { id: 'start', label: 'Start', to: '/' },
  { id: 'assumptions', label: '1 · Assumptions', to: '/assumptions' },
  { id: 'budget', label: '2 · Taxes and spending', to: '/budget/taxes' },
  { id: 'recommendations', label: '3 · Your colleagues', to: '/recommendations' },
  { id: 'budget-day', label: '4 · Budget day', to: '/budget-day' },
];

/**
 * Which tab a step lights up. The seven-stage strip lands with its pages over the next commits;
 * until then the new step ids fold into the nearest existing tab.
 */
function stepGroup(step: JourneyStep): (typeof STEPS)[number]['id'] {
  switch (step) {
    case 'start':
    case 'assumptions':
    case 'recommendations':
    case 'budget-day':
      return step;
    case 'outlook':
    case 'pm':
      return 'assumptions';
    case 'policies':
      return 'recommendations';
    case 'forecast':
    case 'compromise':
    case 'rabbit':
      return 'budget-day';
    default:
      return 'budget';
  }
}

/** The step navigation shared by every page of the journey. */
export function JourneyLayout({ step, children }: { step: JourneyStep; children: ReactNode }) {
  const current = stepGroup(step);
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="journey">
      <Dateline now={dateFor(step)} />
      <nav className="steps" aria-label="Budget steps">
        <ol>
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={`steps__item${s.id === current ? ' steps__item--current' : ''}${i < index ? ' steps__item--done' : ''}`}
              aria-current={s.id === current ? 'step' : undefined}
            >
              <StepLink to={s.to} end={s.id === 'start'}>
                {s.label}
              </StepLink>
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}
