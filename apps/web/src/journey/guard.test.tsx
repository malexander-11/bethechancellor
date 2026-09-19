import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// Any seed serves: the guard reads only how far the game has got.
const G = 's.417_pl.adviser_hr.20';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the road runs one way', () => {
  it('sends a game that jumps ahead back to the furthest open stage', () => {
    // Agreed with the PM (st.2), so the package is open and the rabbit is not.
    const early = at(`/rabbit?${BASE}&g=${G}_st.2`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    early.unmount();
    // Left the forecast for the sums (st.4): Budget day is still two stops away.
    at(`/budget-day?${BASE}&g=${G}_st.4_rv.1`);
    expect(screen.getByText('Make the sums add up')).toBeInTheDocument();
  });

  it('opens Budget day from the rabbit, and a finished link opens it with every beat', () => {
    const fromRabbit = at(`/budget-day?${BASE}&g=${G}_st.5_rv.1`);
    expect(screen.getByText('Deliver the Budget')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/ })).toBeInTheDocument();
    fromRabbit.unmount();
    at(`/budget-day?${BASE}&g=${G}_st.6_rv.1`);
    expect(screen.getByText('Deliver the Budget')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('keeps a sandbox link open to the package and Budget day, and sends its story pages to the outlook', () => {
    const desk = at(`/budget/spending?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    desk.unmount();
    const day = at(`/budget-day?${BASE}&L=itbr.1`);
    expect(screen.getByText('Deliver the Budget')).toBeInTheDocument();
    day.unmount();
    at(`/pm?${BASE}`);
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
  });

  it('always lets you go back: a game at the sums can reopen the package and the PM', () => {
    const desk = at(`/budget/taxes?${BASE}&g=${G}_st.4_rv.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    desk.unmount();
    at(`/pm?${BASE}&g=${G}_st.4_rv.1`);
    expect(screen.getByText('Agree the themes with the Prime Minister')).toBeInTheDocument();
  });
});
