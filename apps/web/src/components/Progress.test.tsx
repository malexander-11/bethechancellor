import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget } from '../data';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
const [first, second] = budget.themes;

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Each stop's state, from its class: done, current, open or ahead. */
const kinds = (bar: HTMLElement) =>
  [...bar.querySelectorAll('.progress__stop')].map(
    (li) => /progress__stop--(\w+)/.exec(li.className)?.[1],
  );
/** What each stop's mark shows: a drawn tick, or its numeral. */
const marks = (bar: HTMLElement) =>
  [...bar.querySelectorAll('.progress__num')].map((m) =>
    m.querySelector('svg') ? 'tick' : m.textContent,
  );
const pages = budget.themes.length + 1;

describe('the progress bar', () => {
  it('says which step this is and which page of it, and leaves the road ahead inert', () => {
    at(`/measures/${second?.id}?${BASE}&g=st.0_rd.3`);
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    // The walk has a page a theme and one for the small print, and the line says which.
    expect(within(bar).getByText(`The Chancellor’s measures · 2 of ${pages}`)).toBeInTheDocument();
    expect(within(bar).getAllByRole('listitem')).toHaveLength(4);
    // Here: marked and not a link.
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(
      /The Chancellor’s measures/,
    );
    // Ahead: inert, and said to be.
    expect(within(bar).getByText(/Balance your Budget \(not yet open\)/)).toBeInTheDocument();
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
    expect(kinds(bar)).toEqual(['current', 'ahead', 'ahead', 'ahead']);
    expect(marks(bar)).toEqual(['1', '2', '3', '4']);
  });

  it('tells the steps behind you from a step you opened ahead and one not yet open', () => {
    // Back on the walk in a game that had reached the review: the balance is behind it, the review
    // opened and not finished, and Budget day open from it.
    at(`/measures/${first?.id}?${BASE}&g=st.2_rd.3`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(kinds(bar)).toEqual(['current', 'done', 'open', 'open']);
    expect(marks(bar)).toEqual(['1', 'tick', '3', '4']);
    expect(within(bar).getByRole('link', { name: '3. Deliver the Budget' })).toBeInTheDocument();
    // At the review, the walk and the balance are behind you: ticks, and links back.
    const review = at(`/review?${BASE}&g=st.2_rd.3`);
    const bars = screen.getAllByRole('navigation', { name: 'Budget steps' });
    const latest = bars[bars.length - 1] as HTMLElement;
    expect(kinds(latest)).toEqual(['done', 'done', 'current', 'open']);
    expect(marks(latest)).toEqual(['tick', 'tick', '3', '4']);
    expect(
      within(latest).getByRole('link', { name: '1. The Chancellor’s measures (done)' }),
    ).toBeInTheDocument();
    review.unmount();
  });

  it('names the four steps the player was promised, in order', () => {
    at(`/review?${BASE}&g=st.2_rd.3`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const names = within(bar)
      .getAllByRole('listitem')
      .map((li) =>
        li.querySelector('.sr-only')?.textContent?.replace(/ \((done|not yet open)\)$/, ''),
      );
    expect(names).toEqual([
      '1. The Chancellor’s measures',
      '2. Balance your Budget',
      '3. Deliver the Budget',
      '4. Feedback',
    ]);
    // A wide screen shows each step's short name beside its numeral (Phase 25), hidden from a
    // screen reader, which hears the full name once.
    const shorts = [...bar.querySelectorAll('.progress__label')];
    expect(shorts.map((s) => s.textContent)).toEqual([
      'Measures',
      'Balance',
      'Deliver',
      'Feedback',
    ]);
    for (const s of shorts) expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the Chancellor’s Budget to its invitation: the road starts on the walk', () => {
    const opening = at(`/?${BASE}`);
    expect(screen.queryByRole('navigation', { name: 'Budget steps' })).toBeNull();
    expect(screen.queryByText(/Step \d of 4/)).toBeNull();
    opening.unmount();
    at(`/measures/${first?.id}?${BASE}&g=st.0_rd.3`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(bar).getByText('Step 1 of 4')).toBeInTheDocument();
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
  });

  it('carries the budget with every link it offers', () => {
    at(`/review?${BASE}&g=st.2_rd.3&L=b6ai.1`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const walk = within(bar).getByRole('link', { name: /The Chancellor’s measures/ });
    expect(walk).toHaveAttribute('href', expect.stringContaining(`/measures/${first?.id}?`));
    expect(walk).toHaveAttribute('href', expect.stringContaining('g=st.2_rd.3'));
    expect(walk).toHaveAttribute('href', expect.stringContaining('L=b6ai.1'));
  });
});
