import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { leversByCategory } from '../data';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function at(path: string, search = BASE) {
  window.history.replaceState(null, '', `${path}?${search}`);
  const view = render(
    <MemoryRouter initialEntries={[`${path}?${search}`]}>
      <App />
    </MemoryRouter>,
  );
  // A link carrying levers arrives with every beat open and has no Continue to press.
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}

describe('the package in two parts', () => {
  it('opens on the taxes as part one of two, and leads to the spending', () => {
    at('/budget/taxes');
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Part 1 of 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next: the spending' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /colleagues/ })).toBeNull();
  });

  it('sends the old third screen and the old recommendations step to the spending, query intact', () => {
    for (const path of ['/recommendations', '/budget/policies']) {
      const { unmount } = at(path, `${BASE}&L=itbr.1`);
      expect(screen.getByText(/Part 2 of 2/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to the taxes' })).toBeInTheDocument();
      // The penny on the basic rate survived the redirect.
      expect(screen.getByText(/Headroom, 2029-30/)).toBeInTheDocument();
      expect(screen.getAllByText(/Basic rate/).length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('puts the new revenue options in their tax groups, badged for what they are', () => {
    at('/budget/taxes');
    fireEvent.click(screen.getByRole('tab', { name: /Business/ }));
    const business = screen.getByRole('tabpanel');
    // A lever is a named group now, so it is found by its title whatever control it holds.
    expect(within(business).getByRole('group', { name: 'Business rates' })).toBeInTheDocument();
    expect(within(business).getByText('Mechanical')).toBeInTheDocument();
    expect(
      within(business).getByRole('group', { name: 'Raise the bank surcharge from 3% to 5%' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Capital taxes/ }));
    const capital = screen.getByRole('tabpanel');
    // Certified rows and our own arithmetic sit side by side; the badge does the quarantining.
    expect(within(capital).getAllByText('Direct costing').length).toBeGreaterThan(0);
    expect(within(capital).getAllByText('Assumption').length).toBeGreaterThan(0);
    expect(
      within(capital).getByRole('group', {
        name: 'Tax extreme wealth: 1% a year on net wealth above £10m',
      }),
    ).toBeInTheDocument();
    expect(within(capital).getByText(/upper bound/)).toBeInTheDocument();
  });

  it('puts the flagship programmes on the spending screen with a minister under each', () => {
    at('/budget/spending');
    expect(screen.getByText(/Part 2 of 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Flagship programmes/ }));
    const panel = screen.getByRole('tabpanel');
    const flagships = leversByCategory.spend.filter((l) => l.group === 'Flagship programmes');
    expect(flagships.length).toBeGreaterThanOrEqual(6);
    for (const lever of flagships) {
      expect(within(panel).getByRole('group', { name: lever.title })).toBeInTheDocument();
    }
    expect(within(panel).getAllByText('Defence Secretary').length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getAllByText('Education Secretary').length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getAllByText('Transport Secretary').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('Communities Secretary').length).toBeGreaterThan(0);
    // The Director of Public Spending says whose arithmetic these are.
    expect(within(panel).getByText(/nobody has certified a costing/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing adopted yet/)).toBeNull();
    expect(screen.queryByText(/colleagues/)).toBeNull();
  });

  it('keeps the shelved policies off every screen, and an old link to one still opens', () => {
    at('/budget/spending', `${BASE}&L=water.1_dfe.-2`);
    expect(screen.getByText(/Ignored unknown lever code/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Bring water into public ownership' })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Shelved/ })).toBeNull();
    // The rest of the link is intact.
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    expect(screen.getAllByText('Education Secretary').length).toBeGreaterThan(0);
  });
});
