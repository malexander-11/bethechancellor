import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetProvider, useBudget } from './budget';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

/** Two buttons a page might hold: one that changes the budget, one that moves on. */
function Page() {
  const { dispatch, query } = useBudget();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => dispatch({ type: 'setLever', code: 'itbr', value: 1 })}>Change</button>
      <button onClick={() => navigate({ pathname: '/review', search: `?${query}` })}>
        Move on
      </button>
    </>
  );
}

/** The app's own router, on the real address bar. */
function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <BrowserRouter>
      <BudgetProvider>
        <Page />
      </BudgetProvider>
    </BrowserRouter>,
  );
}

const change = () => fireEvent.click(screen.getByRole('button', { name: 'Change' }));
const moveOn = () => fireEvent.click(screen.getByRole('button', { name: 'Move on' }));
/** Past the moment the address bar is written. */
const settle = () => act(() => vi.advanceTimersByTime(200));
const lever = () => new URLSearchParams(window.location.search).get('L');

describe('the address bar follows the budget (2026-09-30)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes the budget to the page the player is on, even one they moved to a moment ago', () => {
    at(`/finetune/tax?${BASE}`);
    change();
    moveOn();
    settle();
    expect(window.location.pathname).toBe('/review');
    expect(lever()).toBe('itbr.1');
  });

  it('puts the budget back in the address bar when the player goes back', async () => {
    at(`/finetune/tax?${BASE}`);
    moveOn();
    change();
    settle();
    expect(window.location.pathname).toBe('/review');
    expect(lever()).toBe('itbr.1');
    // Back lands on the entry the player left, whose address still has the budget as it was then.
    await act(async () => {
      window.history.back();
      await vi.waitFor(() => expect(window.location.pathname).toBe('/finetune/tax'));
    });
    settle();
    expect(lever()).toBe('itbr.1');
  });
});
