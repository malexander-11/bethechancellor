import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { Dateline } from './Dateline';
import { dateFor } from '../data';
import { StepLink } from '../journey/links';

const STEPS: Array<{
  id: 'start' | 'outlook' | 'pm' | 'budget' | 'forecast' | 'compromise' | 'budget-day';
  label: string;
  to: string;
}> = [
  { id: 'start', label: 'Start', to: '/' },
  { id: 'outlook', label: '1 · Outlook', to: '/outlook' },
  { id: 'pm', label: '2 · The PM', to: '/pm' },
  { id: 'budget', label: '3 · The desk', to: '/budget/taxes' },
  { id: 'forecast', label: '4 · The forecast', to: '/forecast' },
  { id: 'compromise', label: '5 · Compromises', to: '/compromise' },
  { id: 'budget-day', label: '7 · Budget day', to: '/budget-day' },
];

/**
 * Which tab a step lights up. The three folders of the desk are one stage; the rabbit lands with
 * its page in the next commit, and until then its step id folds into Budget day.
 */
function stepGroup(step: JourneyStep): (typeof STEPS)[number]['id'] {
  switch (step) {
    case 'start':
    case 'pm':
    case 'forecast':
    case 'compromise':
    case 'budget-day':
      return step;
    case 'outlook':
    case 'assumptions':
      return 'outlook';
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
