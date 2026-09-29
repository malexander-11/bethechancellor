import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game at fine-tuning, on today's estimate, with a penny on the basic rate. */
const TUNING = `${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5&L=itbr.1`;

function at(path: string) {
  // The provider reads the Budget out of the real location, so set it before rendering.
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const h1 = (name: string) => screen.getByRole('heading', { level: 1, name });

describe('journey routes', () => {
  it('opens on one sentence, the playtime and the one button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByText(/About 9 minutes/)).toBeInTheDocument();
    const go = screen.getByRole('link', { name: 'Build my Budget' });
    expect(go).toHaveAttribute('href', expect.stringMatching(/^\/outlook/));
    // No tutorial, no adviser essays: the advisers wait for the screens where they matter.
    expect(screen.queryByText('Permanent Secretary to the Treasury')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('sends the desk’s old addresses to step 4 in a game, and to the briefing without one', () => {
    // Every lever is a policy on step 4 (Phase 26): the desk's screens open the ones that took
    // their levers, the Budget carried over.
    for (const [path, name] of [
      ['/b', 'Fine-tune tax'],
      ['/budget', 'Fine-tune tax'],
      ['/budget/taxes', 'Fine-tune tax'],
      ['/budget/spending', 'Fine-tune spending'],
      ['/budget/policies', 'Fine-tune spending'],
      ['/recommendations', 'Fine-tune spending'],
    ] as const) {
      const view = at(`${path}?${TUNING}`);
      expect(h1(name), path).toBeInTheDocument();
      view.unmount();
    }
    // With no game, the briefing: its button starts the game, and the link's measures go into it.
    at(`/b?${BASE}&L=itbr.1`);
    expect(h1('Your briefing')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'About this link' })).toHaveTextContent(
      'This link’s measures will be in your Budget when you start.',
    );
  });

  it('names each screen in the tab title and puts a skip link first in the tab order', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/outlook']}>
        <App />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Your briefing · Step 1 of 6 · Be the Chancellor');
    const skip = screen.getByRole('link', { name: 'Skip to the step' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.body.querySelector('a, button, input, [tabindex]')).toBe(skip);
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1');
    unmount();
    at(`/finetune/tax?${TUNING}`);
    // The heading is the part's name, so the tab says it once.
    expect(document.title).toBe('Fine-tune tax · Step 4 of 6 · Be the Chancellor');
  });

  it('moves focus to the new screen when a step link is followed', () => {
    at(`/finetune/tax?${TUNING}`);
    fireEvent.click(screen.getByRole('link', { name: 'Next: spending' }));
    expect(document.title).toBe('Fine-tune spending · Step 4 of 6 · Be the Chancellor');
    expect(document.activeElement).toBe(document.getElementById('main'));
  });

  it('lands the old assumptions link on the briefing, one estimate and no choice, and Budget day with the verdicts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/assumptions']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeInTheDocument();
    // One figure to plan on (Phase 24): no forecasts to choose between, no target to set.
    expect(screen.getByText('Your headroom')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Set your priorities' })).toBeInTheDocument();
    unmount();
    // Budget day opens for a game that has reached it; a finished game's link carries its g=.
    at(`/budget-day?${BASE}&g=st.5_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    // The documents, with the workings behind them, are one fold away.
    fireEvent.click(screen.getByText('Budget documents'));
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    expect(screen.getAllByText('Rule met').length).toBeGreaterThanOrEqual(2);
  });
});
