import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('a step arrives in beats', () => {
  it('does not put the next beat in the document until you continue', () => {
    at(`/budget/taxes?${BASE}`);
    // Beat 0 is the Director of Tax handing over the file; the folders are not rendered at all,
    // so the gate is real rather than something hidden with CSS.
    expect(screen.queryByRole('tablist')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(within(screen.getByRole('tablist')).getAllByRole('tab').length).toBeGreaterThan(3);
  });

  it('keeps the earlier beat on the page, so its sources stay reachable', () => {
    at(`/budget/taxes?${BASE}`);
    const before = screen.getAllByRole('link').length;
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    // Accumulating rather than replacing: the adviser's briefing and its citations are still there.
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('link').length).toBeGreaterThan(before);
  });

  it('leaves exactly one live continue button at a time, and none at the end', () => {
    at(`/budget-day?${BASE}`);
    // Three beats: the speech, the reaction, the close.
    for (let i = 0; i < 2; i += 1) {
      expect(screen.getAllByRole('button', { name: /Continue/ })).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    }
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('opens every beat at once for a link that carries a budget', () => {
    // Someone sharing their Budget means "look at this", not "sit through the introduction".
    at(`/budget-day?${BASE}&L=itbr.2`);
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByText('The rules in full')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The markets' })).toBeInTheDocument();
  });

  it('remembers how far you got in a step, but not in a step you have not opened', () => {
    const first = at(`/budget/taxes?${BASE}`);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    first.unmount();

    // Coming back to a step you have worked resumes where you left off.
    const second = at(`/budget/taxes?${BASE}`);
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    second.unmount();

    // A step you have never opened still plays from the top.
    at(`/recommendations?${BASE}`);
    expect(screen.getByRole('button', { name: /Continue/ })).toBeInTheDocument();
  });

  it('never lets a beat reach the query string', () => {
    at(`/budget/taxes?${BASE}`);
    const before = window.location.search;
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    // The query string means one thing only: a budget.
    expect(window.location.search).toBe(before);
  });
});
