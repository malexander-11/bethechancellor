import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { budget } from './data';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** A game at fine-tuning, with a penny on the basic rate. */
const TUNING = `${BASE}&g=st.0_rd.2&L=itbr.1`;

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
  it('opens on the Chancellor’s Budget, with one button (ADR-0045)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(h1(budget.title)).toBeVisible();
    // The date is a fact of the Budget now, not a countdown; no playtime (ADR-0032); and no road:
    // the steps start on the screen the button opens (ADR-0033).
    expect(screen.queryByText(/minutes/)).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Budget steps' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Change the Chancellor’s Budget' })).toHaveLength(
      1,
    );
    // No tutorial, no adviser essays: the advisers wait for the screens where they matter.
    expect(screen.queryByText('Permanent Secretary to the Treasury')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('sends the desk’s old addresses to fine-tuning in a game, and to the Budget without one', () => {
    // Every lever is a policy on the fine-tuning screens (Phase 26): the desk's screens open the
    // ones that took their levers, the Budget carried over.
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
    // With no game, the Chancellor's Budget: its button starts the game, and the link's measures
    // go into it.
    at(`/b?${BASE}&L=itbr.1`);
    expect(h1(budget.title)).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'About this link' })).toHaveTextContent(
      'This link’s measures will be in your Budget when you start.',
    );
  });

  it('names each screen in the tab title and puts a skip link first in the tab order', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(document.title).toBe(`${budget.title} · What’s your Budget?`);
    const skip = screen.getByRole('link', { name: 'Skip to the step' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.body.querySelector('a, button, input, [tabindex]')).toBe(skip);
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1');
    unmount();
    at(`/finetune/tax?${TUNING}`);
    // The heading is the part's name, so the tab says it once.
    expect(document.title).toBe('Fine-tune tax · Step 1 of 3 · What’s your Budget?');
  });

  it('opens a page whose link ends in a broken fragment as if it had none', async () => {
    // "%E0%A4%A" is not a whole character, so decoding it throws; that once blanked the page.
    at('/about#%E0%A4%A');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('moves focus to the new screen when a step link is followed', () => {
    at(`/finetune/tax?${TUNING}`);
    fireEvent.click(screen.getByRole('link', { name: 'Next: spending' }));
    expect(document.title).toBe('Fine-tune spending · Step 1 of 3 · What’s your Budget?');
    expect(document.activeElement).toBe(document.getElementById('main'));
  });

  it('lands the retired addresses on the Budget, and Budget day with the verdicts', () => {
    // The briefing, the priorities and the flagships (ADR-0025) open the Chancellor's Budget.
    for (const path of [
      '/assumptions',
      '/outlook',
      '/pm',
      '/budget/deliver',
      '/budget/deliver/2',
    ]) {
      const view = at(`${path}?${BASE}`);
      expect(h1(budget.title), path).toBeInTheDocument();
      // One figure to plan on (Phase 24): no forecasts to choose between, no target to set.
      expect(screen.queryByRole('radiogroup')).toBeNull();
      expect(screen.queryByRole('radio')).toBeNull();
      view.unmount();
    }
    // Budget day opens for a game that has reached it; a finished game's link carries its g=.
    at(`/budget-day?${BASE}&g=st.2_rd.2`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    // Each audience's verdict, and no Budget documents (ADR-0043).
    expect(screen.getByRole('heading', { name: 'The markets' })).toBeInTheDocument();
    expect(screen.queryByText('Budget documents')).toBeNull();
  });
});
