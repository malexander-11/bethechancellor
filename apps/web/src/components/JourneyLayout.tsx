import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { Dateline } from './Dateline';
import { Guide } from './Guide';
import { dateFor } from '../data';
import { StepLink } from '../journey/links';

/** The seven steps as the strip shows them. The forecast and the sums are one step, two screens. */
const STEPS: Array<{
  id: 'start' | 'outlook' | 'pm' | 'budget' | 'forecast' | 'rabbit' | 'budget-day';
  label: string;
  to: string;
}> = [
  { id: 'start', label: '1 · The appointment', to: '/' },
  { id: 'outlook', label: '2 · The outlook', to: '/outlook' },
  { id: 'pm', label: '3 · The PM', to: '/pm' },
  { id: 'budget', label: '4 · The desk', to: '/budget/taxes' },
  { id: 'forecast', label: '5 · The forecast', to: '/forecast' },
  { id: 'rabbit', label: '6 · The rabbit', to: '/rabbit' },
  { id: 'budget-day', label: '7 · Budget day', to: '/budget-day' },
];

/** Which tab a step lights up. The three folders of the desk are one stage. */
function stepGroup(step: JourneyStep): (typeof STEPS)[number]['id'] {
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

/** The step navigation and the guide shared by every page of the journey. */
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
      <Guide step={step} />
      {children}
    </div>
  );
}
