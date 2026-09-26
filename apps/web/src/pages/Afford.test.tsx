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
const who = (name: RegExp) => screen.getByRole('region', { name });
const gapLine = () => screen.getByRole('region', { name: 'The gap' }).textContent ?? '';

describe('build your Budget: pay for it', () => {
  it('sends a sandbox with no game to the desk', () => {
    at(`/budget/afford?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
  });

  it('stacks the five who-pays groups on one screen, each counting its options, with no tabs', () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10`);
    expect(screen.getByRole('heading', { level: 1, name: 'Pay for it' })).toBeInTheDocument();
    expect(screen.getByText(/^Build your Budget · 3 of 3$/)).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    const groups = screen
      .getAllByRole('heading', { level: 2 })
      .filter((h) => h.closest('.who'))
      .map((h) => h.textContent);
    expect(groups).toEqual([
      expect.stringMatching(/^Everyone/),
      expect.stringMatching(/^The best-off/),
      expect.stringMatching(/^Business/),
      expect.stringMatching(/^Savers and owners/),
      expect.stringMatching(/^Drivers, drinkers, smokers, gamblers, flyers/),
    ]);
    expect(who(/^Everyone/)).toHaveAccessibleName(/6 options/);
    expect(within(who(/^Everyone/)).getAllByRole('checkbox')).toHaveLength(6);
    // The gap: the target less the headroom, with what the priorities cost.
    expect(gapLine()).toMatch(/(short|to spare)/);
    expect(gapLine()).toMatch(/£20bn you set out to keep/);
    expect(gapLine()).toMatch(/Your priorities cost £1\.\dbn in 2029-30/);
    // The Political Adviser's press summary is folded under "The morning papers": badged, no
    // masthead, and not read until asked for.
    const papers = screen.getByText('The morning papers').closest('details') as HTMLElement;
    expect(papers).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('The morning papers'));
    expect(papers).toHaveAttribute('open');
    const note = within(papers).getByRole('complementary', { name: /press summary/ });
    expect(within(note).getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
  });

  it('choosing raises the figure it says; the group, the bar and the gap line follow', async () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10`);
    const before = gapLine();
    const bar = screen.getByRole('region', { name: 'Your Budget so far' });
    const figure = () => bar.querySelector('.bar__figure')?.textContent ?? '';
    const was = figure();
    const levy = within(who(/^Everyone/)).getByRole('checkbox', {
      name: /health and social care levy/i,
    });
    const card = levy.closest('.choice') as HTMLElement;
    expect(within(card).getByText(/Raises £1\d\.\dbn · leaves £/)).toBeInTheDocument();
    expect(screen.getByText(/^Figures are for 2029-30/)).toBeInTheDocument();
    fireEvent.click(levy);
    await waitFor(() => expect(L()).toMatch(/hscl\.1/));
    // Once on, the card says what the Budget would have without it; the group counts it and says
    // what it raises; the bar and the gap line move.
    expect(within(card).getByText(/Raises £1\d\.\dbn · without it £/)).toBeInTheDocument();
    expect(who(/^Everyone/)).toHaveAccessibleName(/1 chosen · raises £1\d\.\dbn/);
    expect(figure()).not.toBe(was);
    expect(gapLine()).not.toBe(before);
    expect(gapLine()).toMatch(/to spare/);
  });

  it('shows the manifesto on the levers it fences, the earliest start, and a start after the target year', async () => {
    at(`/budget/afford?${BASE}&${GAME}`);
    // A penny on the basic rate would cross the tax lock: the card says so before it is chosen,
    // and says it has once it is.
    const basic = within(who(/^Everyone/)).getByRole('checkbox', {
      name: /Basic rate of income tax/,
    });
    const basicCard = basic.closest('.choice') as HTMLElement;
    expect(
      within(basicCard).getByText('Would break the manifesto: The tax lock'),
    ).toBeInTheDocument();
    fireEvent.click(basic);
    await waitFor(() =>
      expect(within(basicCard).getByText('Breaks the manifesto: The tax lock')).toBeInTheDocument(),
    );
    const wealth = within(who(/^The best-off/))
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
    const uprating = within(who(/^Drivers/)).getByRole('checkbox', { name: /fuel duty/i });
    expect(uprating).toBeDisabled();
    const card = uprating.closest('.choice') as HTMLElement;
    expect(within(card).getByText('Instead of Cut fuel duty by 10%')).toBeInTheDocument();
    expect(within(card).getByText(/one decision on one duty/)).toBeInTheDocument();
    // A conflict is not also an overlap: the pair is said once.
    expect(within(card).queryByText(/Overlaps with/)).toBeNull();
  });

  it('names an overlapping option before it is chosen, and quotes the interaction once it moves', () => {
    const quiet = at(`/budget/afford?${BASE}&${GAME}`);
    const nics = () =>
      within(who(/^Business/))
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

  it('opens the tax desk one link away, and comes back to paying for it', () => {
    at(`/budget/afford?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('link', { name: 'More policies: every tax lever' }));
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Build your Budget · More policies/)).toBeInTheDocument();
    const back = screen.getByRole('link', { name: 'Back to paying for it' });
    expect(back).toHaveAttribute('href', expect.stringMatching(/^\/budget\/afford\?/));
    fireEvent.click(back);
    expect(screen.getByRole('heading', { level: 1, name: 'Pay for it' })).toBeInTheDocument();
  });

  it('takes a snapshot of the package on the way out, and moves the game on', async () => {
    at(`/budget/afford?${BASE}&${GAME}&L=moj.10_ufsm.1`);
    fireEvent.click(screen.getByRole('link', { name: 'Next: the forecast' }));
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
    expect(screen.queryByRole('link', { name: 'Next: the forecast' })).toBeNull();
  });
});
