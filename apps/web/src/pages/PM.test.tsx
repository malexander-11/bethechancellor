import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const next = () => fireEvent.click(screen.getByRole('button', { name: /Continue/ }));

describe('the conversation with the Prime Minister', () => {
  it('sends a link with no game back to the outlook', () => {
    at(`/pm?${BASE}`);
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
  });

  it('opens with what has been done, every line badged simulated and sourced', () => {
    at(`/pm?${BASE}&g=s.7_st.1`);
    expect(screen.getByText(/VAT came off electricity bills/)).toBeInTheDocument();
    expect(screen.getAllByText('Simulated').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole('link', { name: /HMT|No10|Prime Minister/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('will not go on to priorities until a theme is chosen', () => {
    at(`/pm?${BASE}&g=s.7_st.1`);
    next();
    const go = screen.getByRole('button', { name: /Choose the priorities/ });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Security/ }));
    expect(go).toBeEnabled();
    // The PM's pitch for the theme appears, in the PM's voice.
    expect(screen.getByText(/first priority/)).toBeInTheDocument();
  });

  it('offers the theme’s flagships plus the cross-cutting ones, priced by the engine', () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security`);
    next();
    next();
    const boxes = screen.getAllByRole('checkbox');
    // Four security flagships plus the cross-cutting ones; the Defence plan gap is both, once.
    expect(boxes).toHaveLength(5);
    expect(screen.getByText(/Fund the Defence Investment Plan/)).toBeInTheDocument();
    expect(screen.getByText(/End the threshold freeze early/)).toBeInTheDocument();
    expect(screen.getAllByText(/costs £1\.2bn a year/).length).toBeGreaterThan(0);
  });

  it('takes two or three priorities, the PM reacting to each, and no more than three', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security`);
    next();
    next();
    const go = screen.getByRole('button', { name: /Now the promises/ });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Fund the Defence Investment Plan/ }));
    expect(screen.getByText(/not a favour to the Defence Secretary/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Justice uplift/ }));
    expect(go).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Home Office uplift/ }));
    expect(screen.getByRole('checkbox', { name: /Defence day-to-day/ })).toBeDisabled();
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/pr\.dip-gap\+prisons\+borders/);
    });
  });

  it('lets the Chancellor push back, and records a concession as the promise now in force', () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.cost-of-living_pr.ufsm-all+bus-cap`);
    next();
    next();
    next();
    expect(screen.getByText('The tax lock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /I need income tax on the table/ }));
    expect(screen.getByText(/Not the basic rate, not National Insurance/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Accept the terms/ }));
    const item = screen.getByText(/The tax lock — released/).closest('li') as HTMLElement;
    expect(within(item).getByText(/now: The tax lock, narrowed/)).toBeInTheDocument();
    // A refusal leaves the promise standing.
    fireEvent.click(screen.getByRole('button', { name: /Business can pay more/ }));
    expect(screen.getByText(/every boardroom/)).toBeInTheDocument();
    expect(screen.getByText('The promise stands.')).toBeInTheDocument();
    // Two push-backs is the limit.
    expect(screen.queryByRole('button', { name: /Push back/ })).toBeNull();
  });

  it('carries the agreement into the desk link', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.cost-of-living_pr.ufsm-all+bus-cap`);
    next();
    next();
    next();
    const link = screen.getByRole('link', { name: /Agreed. To the desk/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('/budget/taxes'));
    fireEvent.click(link);
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/st\.2/);
      expect(g).toMatch(/pp\./);
    });
  });
});
