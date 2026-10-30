import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';

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

describe('the progress bar', () => {
  it('says which step this is, and leaves the road ahead inert', () => {
    at(`/finetune/spending?${BASE}&g=st.0_rd.2`);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    // Spending is the second of fine-tuning's two screens, and the line says so.
    expect(within(bar).getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(within(bar).getAllByRole('listitem')).toHaveLength(3);
    // Here: marked and not a link.
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(
      /Fine-tune tax and spend/,
    );
    expect(within(bar).queryByRole('link', { name: /Fine-tune tax and spend/ })).toBeNull();
    // Ahead: inert, and said to be.
    expect(within(bar).queryByRole('link', { name: /Deliver the Budget/ })).toBeNull();
    expect(within(bar).getByText(/Deliver the Budget \(not yet open\)/)).toBeInTheDocument();
    expect(within(bar).queryByRole('link', { name: /Feedback/ })).toBeNull();
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
    // Each state has its own mark, not just its own colour (ADR-0033): the numeral here and
    // ahead, and a screen reader hears which steps are not yet open.
    expect(kinds(bar)).toEqual(['current', 'ahead', 'ahead']);
    expect(marks(bar)).toEqual(['1', '2', '3']);
  });

  it('tells the steps behind you from a step you opened ahead and one not yet open', () => {
    // Back at fine-tuning in a game that had reached the review: the review was opened and not
    // finished, and Budget day is open from it.
    at(`/finetune/tax?${BASE}&g=st.1_rd.2`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(bar).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(bar.querySelector('.progress__name')?.textContent).toBe(
      'Fine-tune tax and spend · 1 of 2',
    );
    expect(kinds(bar)).toEqual(['current', 'open', 'open']);
    expect(marks(bar)).toEqual(['1', '2', '3']);
    expect(within(bar).getByRole('link', { name: '2. Deliver the Budget' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: '3. Feedback' })).toBeInTheDocument();
    // At the review, fine-tuning is behind you: a tick, and a link back.
    const review = at(`/review?${BASE}&g=st.1_rd.2`);
    const bars = screen.getAllByRole('navigation', { name: 'Budget steps' });
    const latest = bars[bars.length - 1] as HTMLElement;
    expect(kinds(latest)).toEqual(['done', 'current', 'open']);
    expect(marks(latest)).toEqual(['tick', '2', '3']);
    expect(
      within(latest).getByRole('link', { name: '1. Fine-tune tax and spend (done)' }),
    ).toBeInTheDocument();
    review.unmount();
  });

  it('names the three steps the player was promised, in order', () => {
    at(`/review?${BASE}&g=st.1_rd.2`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const names = within(bar)
      .getAllByRole('listitem')
      .map((li) =>
        li.querySelector('.sr-only')?.textContent?.replace(/ \((done|not yet open)\)$/, ''),
      );
    expect(names).toEqual(['1. Fine-tune tax and spend', '2. Deliver the Budget', '3. Feedback']);
    // A wide screen shows each step's short name beside its numeral (Phase 25): the step's own
    // words, cut down; hidden from a screen reader, which hears the full name once.
    const shorts = [...bar.querySelectorAll('.progress__label')];
    expect(shorts.map((s) => s.textContent)).toEqual(['Fine-tune', 'Deliver', 'Feedback']);
    for (const s of shorts) expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the Chancellor’s Budget to its invitation: the road starts on fine-tuning', () => {
    // The Budget is the invitation to change it, so it shows no step and no road (ADR-0045).
    const opening = at(`/?${BASE}`);
    expect(screen.queryByRole('navigation', { name: 'Budget steps' })).toBeNull();
    expect(screen.queryByText(/Step \d of 3/)).toBeNull();
    opening.unmount();
    // Its button opens fine-tuning, where the road starts, and a game just begun has nothing
    // ahead of it open.
    at(`/finetune/tax?${BASE}&g=st.0_rd.2`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(bar).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
    expect(kinds(bar)).toEqual(['current', 'ahead', 'ahead']);
  });

  it('carries the budget with every link it offers', () => {
    at(`/review?${BASE}&g=st.1_rd.2&L=itbr.1`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const tune = within(bar).getByRole('link', { name: /Fine-tune tax and spend/ });
    expect(tune).toHaveAttribute('href', expect.stringContaining('/finetune/tax?'));
    expect(tune).toHaveAttribute('href', expect.stringContaining('g=st.1_rd.2'));
    expect(tune).toHaveAttribute('href', expect.stringContaining('L=itbr.1'));
  });
});
