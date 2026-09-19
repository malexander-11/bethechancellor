import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { leversByCategory } from '../data';

function at(path: string, search = 'v=1&f=obr2603&r=ch2602&i=2027') {
  window.history.replaceState(null, '', `${path}?${search}`);
  render(
    <MemoryRouter initialEntries={[`${path}?${search}`]}>
      <App />
    </MemoryRouter>,
  );
  // A link carrying levers arrives with every beat open and has no Continue to press.
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
}

describe('the policies screen', () => {
  it('is where the old recommendations step now lands, as the third part of the package', () => {
    at('/recommendations');
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Part 3 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the spending' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Taxes' })).toBeNull();
  });

  it('lists every policy your colleagues are campaigning for as something you can adopt', () => {
    at('/budget/policies');
    expect(leversByCategory.campaign.length).toBeGreaterThanOrEqual(13);
    for (const lever of leversByCategory.campaign) {
      expect(screen.getByLabelText(lever.title)).toBeInTheDocument();
    }
    expect(screen.getByText(/Nothing adopted yet/)).toBeInTheDocument();
  });

  it('says plainly that these figures are not official costings', () => {
    at('/budget/policies');
    expect(screen.getByText(/not an official costing/)).toBeInTheDocument();
    expect(
      screen.getByText(/None of these has an official costing. The figures here are ours/),
    ).toBeInTheDocument();
  });

  it('counts what you adopted and what it costs', () => {
    at('/budget/policies', 'v=1&f=obr2603&r=ch2602&i=2027&L=airet.1_ufsm.1');
    expect(screen.getByText(/2 adopted · costing £3.2bn in 2029-30/)).toBeInTheDocument();
  });

  it('shows a purchase as cash to borrow, not as spending', () => {
    at('/budget/policies', 'v=1&f=obr2603&r=ch2602&i=2027&L=water.1');
    expect(screen.getByText(/Cash to borrow: £100.0bn/)).toBeInTheDocument();
    expect(screen.getByText(/buying an asset is not spending/)).toBeInTheDocument();
  });

  it('opens a contested card with the word contested', () => {
    at('/budget/policies');
    expect(
      screen.getByText(/Contested. About £7.8bn from roughly 22,000 people, if they stay./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Contested. Most of the people it names are already settled here./),
    ).toBeInTheDocument();
  });
});
