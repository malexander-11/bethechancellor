import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

function at(search = 'v=1&f=obr2603&r=ch2602&i=2027') {
  window.history.replaceState(null, '', `/recommendations?${search}`);
  render(
    <MemoryRouter initialEntries={[`/recommendations?${search}`]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the recommendations step', () => {
  it('lists all eleven policies as things you can adopt', () => {
    at();
    for (const title of [
      'Immediately raise core defence spending to 5% of GDP',
      'Restore foreign aid to 0.7% of gross national income',
      'Replace the triple lock with CPI inflation only',
      'Bring water into public ownership',
      'Tax extreme wealth: 1% a year on net wealth above £10m',
      'Stop benefits to foreign nationals',
      'Universal free school meals',
      'Free university education: abolish undergraduate tuition fees',
      'Expand social rent construction',
      'An artificial intelligence retraining programme',
      'A new higher rate of income tax: 50% above £125,140',
    ]) {
      expect(screen.getByLabelText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/Nothing adopted yet/)).toBeInTheDocument();
  });

  it('says plainly that these figures are not official costings', () => {
    at();
    expect(screen.getByText(/not an official costing/)).toBeInTheDocument();
    expect(
      screen.getByText(/None of these has an official costing. The figures here are ours/),
    ).toBeInTheDocument();
  });

  it('counts what you adopted and what it costs', () => {
    at('v=1&f=obr2603&r=ch2602&i=2027&L=airet.1_ufsm.1');
    expect(screen.getByText(/2 adopted · costing £3.2bn in 2029-30/)).toBeInTheDocument();
  });

  it('shows a purchase as cash to borrow, not as spending', () => {
    at('v=1&f=obr2603&r=ch2602&i=2027&L=water.1');
    expect(screen.getByText(/Cash to borrow: £100.0bn/)).toBeInTheDocument();
    expect(screen.getByText(/buying an asset is not spending/)).toBeInTheDocument();
  });

  it('opens a contested card with the word contested', () => {
    at();
    expect(
      screen.getByText(/Contested. About £7.8bn from roughly 22,000 people, if they stay./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Contested. Most of the people it names are already settled here./),
    ).toBeInTheDocument();
  });
});
