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
    at(`/compromise?${BASE}&g=s.417_st.4_pl.adviser_hr.20_rv.1`);
    expect(screen.getByText('Step 5 of 7')).toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    // The sums are the second screen of the step, and the line says so.
    expect(within(bar).getByText(/^Respond to the forecast · 2 of 2$/)).toBeInTheDocument();
    expect(within(bar).getAllByRole('listitem')).toHaveLength(7);
    // Behind: become Chancellor, the starting position, the priorities and the Budget are links.
    expect(within(bar).getByRole('link', { name: /Become Chancellor/ })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: /Set your priorities/ })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: /Build your Budget/ })).toBeInTheDocument();
    // Here: the sums are the second screen of the forecast step, marked and not a link.
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(
      /Respond to the forecast/,
    );
    expect(within(bar).queryByRole('link', { name: /Respond to the forecast/ })).toBeNull();
    // Ahead: inert, and said to be.
    expect(within(bar).queryByRole('link', { name: /Final choices/ })).toBeNull();
    expect(within(bar).getByText(/Final choices \(not yet open\)/)).toBeInTheDocument();
    expect(within(bar).queryByRole('link', { name: /What your Budget means/ })).toBeNull();
    expect(within(bar).getAllByRole('link')).toHaveLength(4);
  });

  it('offers nothing ahead of you without a game, even where a shared link could go', () => {
    at(`/?${BASE}`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(bar).queryAllByRole('link')).toHaveLength(0);
    expect(bar.querySelector('[aria-current="step"]')?.textContent).toMatch(/Become Chancellor/);
  });

  it('carries the budget with every link it offers, and counts a sub-step of the Budget', () => {
    at(`/pm?${BASE}&g=s.417_st.1_pl.adviser_hr.20`);
    const bar = screen.getByRole('navigation', { name: 'Budget steps' });
    const outlook = within(bar).getByRole('link', { name: /Your starting position/ });
    expect(outlook).toHaveAttribute('href', expect.stringContaining('/outlook?'));
    expect(outlook).toHaveAttribute('href', expect.stringContaining('g=s.417'));
  });
});
