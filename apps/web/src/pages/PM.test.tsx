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
const param = (key: string) => new URLSearchParams(window.location.search).get(key) ?? '';
const priorityBox = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'The Budget’s priorities' })).getByRole('checkbox', {
    name,
  });

describe('agreeing the priorities with the Prime Minister', () => {
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

  it('will not go on until a priority is ranked, and the PM reacts to each one', () => {
    at(`/pm?${BASE}&g=s.7_st.1`);
    next();
    const go = screen.getByRole('button', { name: /Hear the PM read it back/ });
    expect(go).toBeDisabled();
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    fireEvent.click(priorityBox(/Defence on the NATO path/));
    expect(go).toBeEnabled();
    expect(screen.getByText(/not a favour to the Defence Secretary/)).toBeInTheDocument();
  });

  it('ranks up to three in the order ticked, writes them to the link and moves no lever', async () => {
    at(`/pm?${BASE}&g=s.7_st.1`);
    next();
    fireEvent.click(priorityBox(/Defence on the NATO path/));
    fireEvent.click(priorityBox(/Cut the cost of living/));
    fireEvent.click(priorityBox(/Bring down NHS waiting lists/));
    await waitFor(() => expect(param('g')).toMatch(/pr\.defence\+cost-of-living\+nhs/));
    expect(param('L')).toBe('');
    // Ranks read in the order ticked; a fourth cannot be ticked until one is unticked.
    const group = screen.getByRole('group', { name: 'The Budget’s priorities' });
    expect(within(group).getByText('1st').closest('li')).toHaveTextContent(/Defence on the NATO/);
    expect(within(group).getByText('3rd').closest('li')).toHaveTextContent(/NHS waiting lists/);
    expect(priorityBox(/Families and child poverty/)).toBeDisabled();
    fireEvent.click(priorityBox(/Cut the cost of living/));
    await waitFor(() => expect(param('g')).toMatch(/pr\.defence\+nhs(_|$)/));
    expect(priorityBox(/Families and child poverty/)).toBeEnabled();
  });

  it('reads the ranking back with the red lines, and agreeing goes on to the options', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_pr.safer-streets+defence`);
    next();
    next();
    expect(screen.queryByRole('button', { name: /Push back/ })).toBeNull();
    const readBack = document.querySelector('ol.ranked') as HTMLElement;
    expect(within(readBack).getByText('1st').closest('li')).toHaveTextContent(/Safer streets/);
    expect(within(readBack).getByText('2nd').closest('li')).toHaveTextContent(/Defence/);
    expect(screen.getByText(/red lines from step 1 still apply/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Agreed. To the options/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('/budget/'));
    fireEvent.click(link);
    await waitFor(() => {
      expect(param('g')).toMatch(/st\.2/);
      expect(param('g')).toMatch(/pr\.safer-streets\+defence/);
    });
  });

  it('opens a Phase 9 link with a theme as the priority that replaced it', () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security_pr.prisons`);
    next();
    expect(priorityBox(/Defence on the NATO path/)).toBeChecked();
    expect(
      screen.getAllByRole('checkbox').filter((b) => (b as HTMLInputElement).checked),
    ).toHaveLength(1);
  });
});
