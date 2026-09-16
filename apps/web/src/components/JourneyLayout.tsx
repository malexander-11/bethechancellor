import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { Dateline } from './Dateline';
import { dateFor } from '../data';
import { StepLink } from '../journey/links';

const STEPS: Array<{
  id: 'start' | 'outlook' | 'pm' | 'budget' | 'recommendations' | 'budget-day';
  label: string;
  to: string;
}> = [
  { id: 'start', label: 'Start', to: '/' },
  { id: 'outlook', label: '1 · Outlook', to: '/outlook' },
  { id: 'pm', label: '2 · The PM', to: '/pm' },
  { id: 'budget', label: '3 · Taxes and spending', to: '/budget/taxes' },
  { id: 'recommendations', label: '4 · Your colleagues', to: '/recommendations' },
  { id: 'budget-day', label: '5 · Budget day', to: '/budget-day' },
];

/**
 * Which tab a step lights up. The last stages' tabs land with their pages over the next commits;
 * until then those step ids fold into Budget day.
 */
function stepGroup(step: JourneyStep): (typeof STEPS)[number]['id'] {
  switch (step) {
    case 'start':
    case 'pm':
    case 'recommendations':
    case 'budget-day':
      return step;
    case 'outlook':
    case 'assumptions':
      return 'outlook';
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
