import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the progress bar', () => {
  it('says which step this is, links the steps behind you, and leaves the road ahead inert', () => {
    at(`/finetune/spending?${BASE}&g=st.3_pr.defence`);
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    // Spending is the second of fine-tuning's two screens, and the line says so.
    expect(within(bar).getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(within(bar).getAllByRole('listitem')).toHaveLength(6);
    // Behind: the briefing, the priorities and the flagship policies are links.
    expect(within(bar).getByRole('link', { name: /Briefing/ })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: /Set your priorities/ })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: /Flagship policies/ })).toBeInTheDocument();
    // Here: marked and not a link.
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(
      /Fine-tune tax and spend/,
    );
    expect(within(bar).queryByRole('link', { name: /Fine-tune tax and spend/ })).toBeNull();
    // Ahead: inert, and said to be.
    expect(within(bar).queryByRole('link', { name: /Deliver the Budget/ })).toBeNull();
    expect(within(bar).getByText(/Deliver the Budget \(not yet open\)/)).toBeInTheDocument();
    expect(within(bar).queryByRole('link', { name: /Feedback/ })).toBeNull();
    expect(within(bar).getAllByRole('link')).toHaveLength(3);
  });

  it('names the six steps the player was promised, in order', () => {
    at(`/review?${BASE}&g=st.4_pr.defence`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const names = within(bar)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.sr-only')?.textContent?.replace(/ \(not yet open\)$/, ''));
    expect(names).toEqual([
      '1. Briefing',
      '2. Set your priorities',
      '3. Flagship policies',
      '4. Fine-tune tax and spend',
      '5. Deliver the Budget',
      '6. Feedback',
    ]);
    // A wide screen shows each step's short name beside its numeral (Phase 25): the step's own
    // words, cut down; hidden from a screen reader, which hears the full name once.
    const shorts = [...bar.querySelectorAll('.progress__label')];
    expect(shorts.map((s) => s.textContent)).toEqual([
      'Briefing',
      'Priorities',
      'Flagships',
      'Fine-tune',
      'Deliver',
      'Feedback',
    ]);
    for (const s of shorts) expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  it('offers nothing ahead of you without a game, even where a shared link could go', () => {
    at(`/?${BASE}`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
    // The cover is the briefing's first screen.
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(/Briefing/);
  });

  it('carries the budget with every link it offers', () => {
    at(`/pm?${BASE}&g=st.1`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const briefing = within(bar).getByRole('link', { name: /Briefing/ });
    expect(briefing).toHaveAttribute('href', expect.stringContaining('/outlook?'));
    expect(briefing).toHaveAttribute('href', expect.stringContaining('g=st.1'));
  });
});
