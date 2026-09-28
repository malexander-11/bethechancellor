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

const param = (key: string) => new URLSearchParams(window.location.search).get(key) ?? '';
const priorityBox = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'The Budget’s priorities' })).getByRole('checkbox', {
    name,
  });

describe('agreeing the priorities with the Prime Minister', () => {
  it('sends a link with no game back to the briefing', () => {
    at(`/pm?${BASE}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeInTheDocument();
  });

  it('writes the theme of the Budget from the ranking, for the Comms team and the advisers', () => {
    at(`/pm?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    // What the PM has already done is no longer a fold here: the theme is.
    expect(screen.queryByText('What the Prime Minister has already done')).toBeNull();
    const theme = screen.getByRole('region', { name: 'The theme of this Budget' });
    expect(within(theme).getByText('The theme is written from what you tick.')).toBeInTheDocument();
    fireEvent.click(priorityBox(/Defence on the NATO path/));
    expect(within(theme).getByText('A Budget for defence')).toBeInTheDocument();
    expect(within(theme).getByText(/The Comms team will explain the Budget/)).toBeInTheDocument();
    fireEvent.click(priorityBox(/Cut the cost of living/));
    expect(within(theme).getByText('A Budget for defence and the cost of living')).toBeVisible();
    // The PM's reaction to each ranked priority is a game judgement, badged, its facts sourced.
    expect(screen.getAllByText('Game judgement').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('.source a').length).toBeGreaterThan(0);
  });

  it('will not go on until a priority is ranked, and the PM reacts to each one', () => {
    at(`/pm?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    expect(screen.getByRole('button', { name: 'Agree these priorities' })).toBeDisabled();
    expect(screen.getByText('Tick at least one priority.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    fireEvent.click(priorityBox(/Defence on the NATO path/));
    // Once one is ranked, agreeing is a link to the ways to deliver.
    expect(screen.getByRole('link', { name: 'Agree these priorities' })).toBeInTheDocument();
    expect(screen.getByText(/not a favour to the Defence Secretary/)).toBeInTheDocument();
  });

  it('ranks up to three in the order ticked, writes them to the link and moves no lever', async () => {
    at(`/pm?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
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

  it('shows the ranking on the cards with the promises beneath, and agreeing goes on to the options', async () => {
    at(`/pm?${BASE}&g=st.1_pr.safer-streets+defence&M=rate.0.75_rpi.0.5`);
    expect(screen.queryByRole('button', { name: /Push back/ })).toBeNull();
    const group = screen.getByRole('group', { name: 'The Budget’s priorities' });
    expect(within(group).getByText('1st').closest('li')).toHaveTextContent(/Safer streets/);
    expect(within(group).getByText('2nd').closest('li')).toHaveTextContent(/Defence/);
    expect(
      screen.getByText(/promises still apply/, { selector: '.redlines-line' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('What the promises are'));
    expect(screen.getByText(/We will not increase National Insurance/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Agree these priorities' });
    expect(link).toHaveAttribute('href', expect.stringContaining('/budget/'));
    fireEvent.click(link);
    await waitFor(() => {
      expect(param('g')).toMatch(/st\.2/);
      expect(param('g')).toMatch(/pr\.safer-streets\+defence/);
    });
  });

  it('opens a Phase 9 link with a theme as the priority that replaced it', () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security_pr.prisons`);
    expect(priorityBox(/Defence on the NATO path/)).toBeChecked();
    expect(
      screen.getAllByRole('checkbox').filter((b) => (b as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  it('gives the scale before anything is chosen, and says which priority saves money (Phase 25)', () => {
    at(`/pm?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    // Worked out, one price per option: the cheapest full way to deliver each, against headroom.
    expect(
      screen.getByText(
        /^Delivering one priority in full costs from £0\.8bn to £8\.1bn a year by 2029-30\. Your headroom is £6\.8bn\.$/,
      ),
    ).toBeInTheDocument();
    const saving = screen.getAllByText('Saves money');
    expect(saving).toHaveLength(1);
    expect(saving[0]?.closest('.choice__title')?.textContent).toMatch(/Get the welfare bill down/);
  });
});
