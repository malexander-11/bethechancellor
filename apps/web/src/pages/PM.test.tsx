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
const themeBox = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'The Budget’s themes' })).getByRole('checkbox', {
    name,
  });
/** The flagship checkboxes: every checkbox inside a fieldset, whichever theme offers it. */
const flagshipBoxes = () =>
  screen.getAllByRole('checkbox').filter((box) => box.closest('fieldset') !== null);

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

  it('will not go on to the flagships until a theme is ticked', () => {
    at(`/pm?${BASE}&g=s.7_st.1`);
    next();
    const go = screen.getByRole('button', { name: /Choose the flagships/ });
    expect(go).toBeDisabled();
    fireEvent.click(themeBox(/Security/));
    expect(go).toBeEnabled();
    // The PM's pitch for the theme appears, in the PM's voice.
    expect(screen.getByText(/first priority/)).toBeInTheDocument();
  });

  it('offers the ticked themes’ flagships plus the cross-cutting ones, each once, priced by the engine', () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security`);
    next();
    next();
    // Four security flagships plus the cross-cutting ones; the Defence plan gap is both, once.
    expect(flagshipBoxes()).toHaveLength(5);
    expect(screen.getByRole('group', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Whichever theme you pick' })).toBeInTheDocument();
    expect(screen.getByText(/End the threshold freeze early/)).toBeInTheDocument();
    expect(screen.getAllByText(/costs £1\.2bn a year/).length).toBeGreaterThan(0);
  });

  it('funds a flagship the moment it is ticked, and puts the money back when it is unticked', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security`);
    next();
    next();
    const box = screen.getByRole('status', { name: 'Your Budget so far' });
    expect(within(box).getByText('none agreed yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Fund the Defence Investment Plan/ }));
    // The lever moves in the package at once, and the PM reacts.
    await waitFor(() => expect(param('L')).toMatch(/dip47\.1/));
    expect(param('g')).toMatch(/pr\.dip-gap/);
    expect(within(box).getByText('1 of 1 funded')).toBeInTheDocument();
    expect(screen.getByText(/not a favour to the Defence Secretary/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Fund the Defence Investment Plan/ }));
    await waitFor(() => expect(param('L')).not.toMatch(/dip47/));
    expect(param('g')).not.toMatch(/pr\./);
  });

  it('lets two themes be ticked, and unticking one takes its flagships and their money with it', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.security+cost-of-living_pr.prisons+ufsm-all&L=moj.10_ufsm.1`);
    next();
    next();
    expect(screen.getByRole('group', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cost of living' })).toBeInTheDocument();
    fireEvent.click(themeBox(/Cost of living/));
    await waitFor(() => expect(param('L')).toBe('moj.10'));
    expect(param('g')).toMatch(/th\.security(_|$)/);
    expect(param('g')).toMatch(/pr\.prisons(_|$)/);
    expect(screen.queryByRole('group', { name: 'Cost of living' })).toBeNull();
  });

  it('has nothing to negotiate: the red lines are fixed, and agreeing goes to the desk', async () => {
    at(`/pm?${BASE}&g=s.7_st.1_th.cost-of-living_pr.ufsm-all+bus-cap&L=ufsm.1_bus2.1`);
    next();
    next();
    expect(screen.queryByRole('button', { name: /Push back/ })).toBeNull();
    expect(screen.getByText(/red lines from step 1 still apply/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Agreed. Build the package/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('/budget/taxes'));
    fireEvent.click(link);
    await waitFor(() => {
      expect(param('g')).toMatch(/st\.2/);
      expect(param('g')).not.toMatch(/pp\./);
    });
  });
});
