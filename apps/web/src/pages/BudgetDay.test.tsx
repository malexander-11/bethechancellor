import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

function at(search: string) {
  // The provider reads the budget out of the real location, so set it before rendering.
  window.history.replaceState(null, '', `/budget-day?${search}`);
  render(
    <MemoryRouter initialEntries={[`/budget-day?${search}`]}>
      <App />
    </MemoryRouter>,
  );
}

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

describe('Budget day gives feedback from four audiences', () => {
  it('shows a panel for each audience, led by the headline', () => {
    at(BASE);
    for (const title of ['Your own rules', 'The markets', 'Parliament', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // The baseline meets the stability rule with the March forecast's own headroom.
    expect(
      screen.getByText(/You meet the rule with roughly the room your predecessor had/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Capped welfare is above the cap but inside the 5% margin/),
    ).toBeInTheDocument();
  });

  it('prints the reading that chose each band, so the judgement can be checked', () => {
    at(BASE);
    const markets = screen.getByRole('heading', { name: 'The markets' }).closest('section');
    expect(markets).not.toBeNull();
    expect(
      within(markets as HTMLElement).getByText(/Change in borrowing in the target year/),
    ).toBeInTheDocument();
  });

  it('reacts to the Budget: a big spending rise misses the rule and worries the markets', () => {
    at(`${BASE}&L=def5.1`);
    expect(screen.getByText(/You have missed your own stability rule/)).toBeInTheDocument();
    expect(screen.getByText(/A large unfunded increase in borrowing/)).toBeInTheDocument();
    expect(screen.getByText(/You took a few of your colleagues/)).toBeInTheDocument();
  });

  it('names the measures the public feels, with their sources', () => {
    at(`${BASE}&L=cpilock.1`);
    const pub = screen.getByRole('heading', { name: 'The public' }).closest('section');
    expect(within(pub as HTMLElement).getByText('Who feels these measures')).toBeInTheDocument();
    expect(within(pub as HTMLElement).getByText(/Triple lock to CPI/)).toBeInTheDocument();
  });

  it('keeps the tables and charts behind a disclosure so the panels lead', () => {
    at(BASE);
    expect(screen.getByText('Your measures')).toBeInTheDocument();
    expect(screen.getByText('The rules in full')).toBeInTheDocument();
    expect(screen.getByText('Five-year paths')).toBeInTheDocument();
  });
});
