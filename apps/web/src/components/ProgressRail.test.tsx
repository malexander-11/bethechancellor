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

describe('the progress rail', () => {
  it('links the stops behind you, marks where you are, and leaves the road ahead inert', () => {
    at(`/compromise?${BASE}&g=s.417_st.4_pl.adviser_hr.20_rv.1`);
    const rail = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(rail).getAllByRole('listitem')).toHaveLength(7);
    // Behind: the appointment, the outlook, the PM and the desk are links.
    expect(within(rail).getByRole('link', { name: /The appointment/ })).toBeInTheDocument();
    expect(within(rail).getByRole('link', { name: /The PM/ })).toBeInTheDocument();
    expect(within(rail).getByRole('link', { name: /The package/ })).toBeInTheDocument();
    // Here: the sums are the second screen of the forecast stop, marked and not a link.
    expect(within(rail).getByText('The forecast').closest('[aria-current="step"]')).not.toBeNull();
    expect(within(rail).queryByRole('link', { name: /The forecast/ })).toBeNull();
    // Ahead: inert.
    expect(within(rail).queryByRole('link', { name: /The rabbit/ })).toBeNull();
    expect(within(rail).queryByRole('link', { name: /Budget day/ })).toBeNull();
    expect(within(rail).getAllByRole('link')).toHaveLength(4);
  });

  it('offers nothing ahead of you without a game, even where a shared link could go', () => {
    at(`/?${BASE}`);
    const rail = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(rail).queryAllByRole('link')).toHaveLength(0);
    expect(
      within(rail).getByText('The appointment').closest('[aria-current="step"]'),
    ).not.toBeNull();
  });

  it('carries the budget with every link it offers', () => {
    at(`/pm?${BASE}&g=s.417_st.1_pl.adviser_hr.20`);
    const rail = screen.getByRole('navigation', { name: 'Budget steps' });
    const outlook = within(rail).getByRole('link', { name: /The outlook/ });
    expect(outlook).toHaveAttribute('href', expect.stringContaining('/outlook?'));
    expect(outlook).toHaveAttribute('href', expect.stringContaining('g=s.417'));
  });
});
