import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { budget } from './data';
import { WELCOME_TEXT } from './components/Welcome';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** A game on the walk, with a penny on the basic rate. */
const WALKING = `${BASE}&g=st.0_rd.3&L=itbr.1`;
const [first, second] = budget.themes;

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
  it('opens straight on the first measures, with the Budget named and its story folded (ADR-0047)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(h1(first?.title ?? '')).toBeVisible();
    // The Budget is named once above the cards, and what it did waits in one closed fold.
    const welcome = screen.getByRole('region', { name: budget.title });
    expect(welcome).toHaveTextContent(budget.chancellor.name);
    const story = screen.getByText(WELCOME_TEXT.story).closest('details');
    expect(story).not.toHaveAttribute('open');
    expect(story?.textContent).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(story?.textContent).toMatch(/£14\.5bn/);
    // No playtime (ADR-0032), and the road from the first screen.
    expect(screen.queryByText(/minutes/)).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Budget steps' })).toBeInTheDocument();
    // No tutorial, no adviser essays.
    expect(screen.queryByText('Permanent Secretary to the Treasury')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('sends the old addresses to the walk (ADR-0046)', () => {
    // Fine-tuning and the desk before it retired with the walk: their screens open its first page,
    // the Budget carried over.
    for (const path of [
      '/b',
      '/budget',
      '/budget/taxes',
      '/budget/spending',
      '/recommendations',
      '/finetune',
      '/finetune/tax',
      '/finetune/spending',
      '/measures',
      '/measures/nothing',
    ]) {
      const view = at(`${path}?${WALKING}`);
      expect(h1(first?.title ?? ''), path).toBeInTheDocument();
      view.unmount();
    }
    // With no game, the same page, a game started with the link's measures in it (ADR-0047).
    at(`/b?${BASE}&L=itbr.1`);
    expect(h1(first?.title ?? '')).toBeInTheDocument();
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
  });

  it('names each screen in the tab title and puts a skip link first in the tab order', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    // The site's own address is the walk's first page (ADR-0047), named as that page is.
    expect(document.title).toBe(`${first?.title} · Step 1 of 4 · What’s your Budget?`);
    const skip = screen.getByRole('link', { name: 'Skip to the step' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.body.querySelector('a, button, input, [tabindex]')).toBe(skip);
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1');
    unmount();
    at(`/measures/${first?.id}?${WALKING}`);
    // The heading is the theme's name, so the tab says it once.
    expect(document.title).toBe(`${first?.title} · Step 1 of 4 · What’s your Budget?`);
  });

  it('opens a page whose link ends in a broken fragment as if it had none', async () => {
    // "%E0%A4%A" is not a whole character, so decoding it throws; that once blanked the page.
    at('/about#%E0%A4%A');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('moves focus to the new screen when a step link is followed', () => {
    at(`/measures/${first?.id}?${WALKING}`);
    fireEvent.click(
      screen.getByRole('link', { name: `Next: ${second?.title.toLowerCase() ?? ''}` }),
    );
    expect(document.title).toBe(`${second?.title} · Step 1 of 4 · What’s your Budget?`);
    expect(document.activeElement).toBe(document.getElementById('main'));
  });

  it('lands the retired addresses on the walk, and Budget day with the verdicts', () => {
    // The briefing, the priorities and the flagships (ADR-0025) open the walk's first page, a game
    // started when the link has none (ADR-0047).
    for (const path of [
      '/assumptions',
      '/outlook',
      '/pm',
      '/budget/deliver',
      '/budget/deliver/2',
    ]) {
      const view = at(`${path}?${BASE}`);
      expect(h1(first?.title ?? ''), path).toBeInTheDocument();
      expect(screen.queryByRole('radiogroup')).toBeNull();
      view.unmount();
    }
    // Budget day opens for a game that has reached it; a finished game's link carries its g=.
    at(`/budget-day?${BASE}&g=st.3_rd.3`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    // Each audience's verdict, and no Budget documents (ADR-0043).
    expect(screen.getByRole('heading', { name: 'The markets' })).toBeInTheDocument();
    expect(screen.queryByText('Budget documents')).toBeNull();
  });
});
