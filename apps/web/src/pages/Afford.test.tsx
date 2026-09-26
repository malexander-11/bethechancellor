import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const GAME = 'g=s.7_st.2_pl.adviser_hr.20_pr.safer-streets+defence';

function at(path: string) {
  window.history.replaceState(null, '', path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}
const L = () => new URLSearchParams(window.location.search).get('L') ?? '';
const panel = () => screen.getByRole('tabpanel');
const gapLine = () => screen.getByRole('region', { name: 'The gap' }).textContent ?? '';

describe('the ways to afford it', () => {
  it('sends a sandbox with no game to the desk', () => {
    at(`/budget/afford?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
  });

  it('groups the options by who pays, five tabs, each counting its options', () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10`);
    expect(screen.getByText('Choose how to pay for it')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringMatching(/^Everyone/),
      expect.stringMatching(/^The best-off/),
      expect.stringMatching(/^Business/),
      expect.stringMatching(/^Savers and owners/),
      expect.stringMatching(/^Drivers, drinkers, smokers, gamblers, flyers/),
    ]);
    expect(screen.getByRole('tab', { name: /Everyone/ })).toHaveAccessibleName(/6 options/);
    // The gap: the target less the headroom, with what the priorities cost.
    expect(gapLine()).toMatch(/(short|to spare)/);
    expect(gapLine()).toMatch(/£20bn you set out to keep/);
    expect(gapLine()).toMatch(/Your priorities cost £1\.\dbn in 2029-30/);
    // The Political Adviser's press summary moved here from the desk, badged and with no masthead.
    const note = screen.getByRole('complementary', { name: /press summary/ });
    expect(within(note).getByText('Simulated')).toBeInTheDocument();
  });

  it('choosing raises the figure it says, and the tab counts it; the gap line follows', async () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10`);
    const before = gapLine();
    const levy = within(panel()).getByRole('checkbox', { name: /health and social care levy/i });
    const card = levy.closest('.choice') as HTMLElement;
    expect(within(card).getByText(/Raises £1\d\.\dbn · leaves £/)).toBeInTheDocument();
    expect(screen.getByText(/^Figures are for 2029-30/)).toBeInTheDocument();
    fireEvent.click(levy);
    await waitFor(() => expect(L()).toMatch(/hscl\.1/));
    // Once on, the card says what the Budget would have without it.
    expect(within(card).getByText(/Raises £1\d\.\dbn · without it £/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Everyone/ })).toHaveAccessibleName(/1 chosen/);
    expect(gapLine()).not.toBe(before);
    expect(gapLine()).toMatch(/to spare/);
  });

  it('shows the manifesto on the levers it fences, the earliest start, and a start after the target year', async () => {
    at(`/budget/afford?${BASE}&${GAME}`);
    // A penny on the basic rate would cross the tax lock: the card says so before it is chosen,
    // and says it has once it is.
    const basic = within(panel()).getByRole('checkbox', { name: /Basic rate of income tax/ });
    const basicCard = basic.closest('.choice') as HTMLElement;
    expect(
      within(basicCard).getByText('Would break the manifesto: The tax lock'),
    ).toBeInTheDocument();
    fireEvent.click(basic);
    await waitFor(() =>
      expect(within(basicCard).getByText('Breaks the manifesto: The tax lock')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('tab', { name: /The best-off/ }));
    const wealth = within(panel())
      .getByRole('checkbox', { name: /Two per cent above £10m|wealth/i })
      .closest('.choice') as HTMLElement;
    expect(
      within(wealth).getByText(/^Nothing until 2030-31, then raises £18\.5bn · leaves/),
    ).toBeInTheDocument();
    expect(within(wealth).getByText(/Earliest start/)).toBeInTheDocument();
    // Choosing it moves nothing in the target year, so the gap line does not move.
    const before = gapLine();
    fireEvent.click(within(wealth).getByRole('checkbox'));
    await waitFor(() => expect(L()).toMatch(/wealth2\.1/));
    expect(gapLine()).toBe(before);
  });

  it('blocks an option that counts the same money as a way to deliver already in the Budget', () => {
    at(`/budget/afford?${BASE}&${GAME}&L=fuel.-10`);
    fireEvent.click(screen.getByRole('tab', { name: /Drivers/ }));
    const uprating = within(panel()).getByRole('checkbox', { name: /fuel duty/i });
    expect(uprating).toBeDisabled();
    const card = uprating.closest('.choice') as HTMLElement;
    expect(within(card).getByText('Instead of Cut fuel duty by 10%')).toBeInTheDocument();
    expect(within(card).getByText(/one decision on one duty/)).toBeInTheDocument();
    // A conflict is not also an overlap: the pair is said once.
    expect(within(card).queryByText(/Overlaps with/)).toBeNull();
  });

  it('names an overlapping option before it is chosen, and quotes the interaction once it moves', () => {
    const quiet = at(`/budget/afford?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('tab', { name: /Business/ }));
    const nics = () =>
      within(panel())
        .getByRole('checkbox', { name: /^Employer NICs rate/ })
        .closest('.choice') as HTMLElement;
    expect(within(nics()).getByText('Overlaps with Corporation tax')).toBeInTheDocument();
    quiet.unmount();
    at(`/budget/afford?${BASE}&${GAME}&L=ct.1`);
    expect(
      within(nics()).getByText(
        /^Overlaps with Corporation tax: Employer costs and company profits interact/,
      ),
    ).toBeInTheDocument();
  });

  it('opens the tax desk one link away, at the group of the tab’s first option, with a way back', () => {
    at(`/budget/afford?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('tab', { name: /Business/ }));
    fireEvent.click(within(panel()).getByRole('link', { name: /Adjust the details/ }));
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/National Insurance/);
    expect(screen.getByRole('link', { name: 'Back to the ways to afford it' })).toBeInTheDocument();
  });

  it('takes a snapshot of the package on the way out, and moves the game on', async () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10_ufsm.1`);
    fireEvent.click(screen.getByRole('link', { name: /the OBR’s forecast/ }));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('S')).toMatch(/moj\.10/);
      expect(params.get('S')).toMatch(/ufsm\.1/);
      expect(params.get('g')).toMatch(/st\.3/);
    });
  });

  it('leads back to the compromises once the envelope is open', () => {
    at(`/budget/afford?${BASE}&g=s.7_st.4_pl.adviser_hr.20_pr.defence_rv.1&M=rate.0.75_rpi.0.5`);
    expect(screen.getByRole('link', { name: 'Back to the compromises' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /the OBR’s forecast/ })).toBeNull();
  });
});
