import type { JourneyStep } from '@btc/engine';
import type { ReactNode } from 'react';
import { StepLink } from '../journey/links';

const STEPS: Array<{
  id: 'start' | 'assumptions' | 'budget' | 'budget-day';
  label: string;
  to: string;
}> = [
  { id: 'start', label: 'Start', to: '/' },
  { id: 'assumptions', label: '1 · Assumptions', to: '/assumptions' },
  { id: 'budget', label: '2 · Taxes and spending', to: '/budget/taxes' },
  { id: 'budget-day', label: '3 · Budget day', to: '/budget-day' },
];

function stepGroup(step: JourneyStep): (typeof STEPS)[number]['id'] {
  return step === 'taxes' || step === 'spending' ? 'budget' : step;
}

/** The step navigation shared by every page of the journey. */
export function JourneyLayout({ step, children }: { step: JourneyStep; children: ReactNode }) {
  const current = stepGroup(step);
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="journey">
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
