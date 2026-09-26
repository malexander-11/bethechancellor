import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has agreed two priorities with the PM and reached the package. */
const GAME = 'g=s.7_st.2_pl.adviser_hr.20_pr.safer-streets+defence';

function at(path: string) {
  window.history.replaceState(null, '', path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  // The sandbox desk still opens with a hand-off; the guided screens have none.
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}
const L = () => new URLSearchParams(window.location.search).get('L') ?? '';
const h1 = (name: RegExp | string) => screen.getByRole('heading', { level: 1, name });
const ways = (name: RegExp) => screen.getByRole('group', { name });
const box = (name: RegExp) => within(ways(/^Ways to deliver/)).getByRole('checkbox', { name });
const bar = () => screen.getByRole('region', { name: 'Your Budget so far' });
const barFigure = () => bar().querySelector('.bar__figure')?.textContent ?? '';

describe('build your Budget: the ways to deliver', () => {
  it('sends a sandbox with no game to the desk, and a game that has not seen the PM back to the PM', () => {
    const sandbox = at(`/budget/deliver?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Build your Budget · 1 of 2/)).toBeInTheDocument();
    sandbox.unmount();
    at(`/budget/deliver?${BASE}&g=s.7_st.1_pl.adviser_hr.20`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('shows one priority per screen, in rank order, with its lead’s line and a way on to the next', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    expect(h1(/^1st Safer streets: prisons, police, borders/)).toBeInTheDocument();
    expect(screen.getByText(/^Build your Budget · 1 of 3$/)).toBeInTheDocument();
    // The Justice Secretary opens safer streets; the Defence Secretary waits for the next screen.
    expect(screen.getAllByText('Justice Secretary').length).toBeGreaterThan(0);
    expect(screen.queryByText('Defence Secretary')).toBeNull();
    expect(screen.getAllByText('Simulated').length).toBeGreaterThanOrEqual(1);
    // Two ways for safer streets: the game has two levers there.
    expect(within(ways(/Ways to deliver: Safer streets/)).getAllByRole('checkbox')).toHaveLength(2);
    // Every card carries the engine's figure for choosing it now, and the headroom that would leave;
    // the year is said once, in the hint. No tabs, no hand-off.
    expect(screen.getAllByText(/Costs £\d+\.\dbn · leaves (−|£)/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^Figures are for 2029-30/)).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );
    // On to the second priority, carrying the Budget.
    const next = screen.getByRole('link', { name: 'Next: Defence on the NATO path' });
    expect(next).toHaveAttribute('href', expect.stringMatching(/^\/budget\/deliver\/2\?/));
    fireEvent.click(next);
    expect(h1(/^2nd Defence on the NATO path/)).toBeInTheDocument();
    expect(screen.getByText(/^Build your Budget · 2 of 3$/)).toBeInTheDocument();
    expect(within(ways(/Ways to deliver: Defence/)).getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Next: pay for it' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/afford\?/),
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
  });

  it('lands a screen number beyond the priorities on the last, and "1" on the bare route', () => {
    const far = at(`/budget/deliver/9?${BASE}&${GAME}`);
    expect(h1(/^2nd Defence/)).toBeInTheDocument();
    far.unmount();
    at(`/budget/deliver/1?${BASE}&${GAME}`);
    expect(h1(/^1st Safer streets/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );
  });

  it('choosing an option moves its levers and the bar keeps score; putting it back restores them', async () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    expect(within(bar()).getByText('0 of 2 delivered')).toBeInTheDocument();
    expect(within(bar()).getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    expect(within(bar()).getByText(/your £20bn target/)).toBeInTheDocument();
    const gap = () => box(/^Fund the Defence Investment Plan’s gap/);
    const card = gap().closest('.choice') as HTMLElement;
    // The card promises the headroom the Budget would then have; the bar shows that figure once
    // the option is in, to the pound.
    const promised = within(card)
      .getByText(/· leaves/)
      .textContent?.match(/leaves (−?£[\d.]+bn)/)?.[1];
    expect(promised).toBeDefined();
    expect(barFigure()).not.toBe(promised);
    fireEvent.click(gap());
    await waitFor(() => expect(L()).toMatch(/dip47\.1/));
    expect(barFigure()).toBe(promised);
    expect(within(bar()).getByText('1 of 2 delivered')).toBeInTheDocument();
    expect(gap()).toBeChecked();
    // Once on, the minister behind the lever reacts, and the card prices what putting it back would
    // undo: the headroom the Budget would have without it.
    expect(screen.getAllByText('Defence Secretary').length).toBeGreaterThanOrEqual(2);
    expect(within(card).getByText(/Costs £\d+\.\dbn · without it (−|£)/)).toBeInTheDocument();
    fireEvent.click(gap());
    await waitFor(() => expect(L()).not.toMatch(/dip47/));
    expect(within(bar()).getByText('0 of 2 delivered')).toBeInTheDocument();
  });

  it('shows a lever adjusted on the desk as neither on nor off, with where it stands', () => {
    at(`/budget/deliver?${BASE}&${GAME}&L=moj.5`);
    const prisons = box(/A Justice uplift for prison capacity/);
    expect(prisons).not.toBeChecked();
    const card = prisons.closest('.choice') as HTMLElement;
    expect(within(card).getByText(/Adjusted on the desk/)).toBeInTheDocument();
    expect(card.className).toMatch(/choice--adjusted/);
  });

  it('wears the red lines, the earliest starts and a later start on the options that carry them', async () => {
    at(`/budget/deliver?${BASE}&g=s.7_st.2_pl.adviser_hr.20_pr.welfare-bill+families`);
    expect(h1(/^1st Get the welfare bill down/)).toBeInTheDocument();
    const twoChild = box(/Reinstate the two-child limit/);
    const twoChildCard = twoChild.closest('.choice') as HTMLElement;
    expect(
      within(twoChildCard).getByText(
        'Would break the manifesto: The two-child limit stays abolished',
      ),
    ).toBeInTheDocument();
    fireEvent.click(twoChild);
    await waitFor(() =>
      expect(
        within(twoChildCard).getByText('Breaks the manifesto: The two-child limit stays abolished'),
      ).toBeInTheDocument(),
    );
    // The unemployment insurance limit cannot start before 2030-31: the card says so (ADR-0021).
    const insurance = box(/Time-limit the new unemployment insurance/).closest(
      '.choice',
    ) as HTMLElement;
    expect(
      within(insurance).getByText(/Nothing until 2030-31, then saves £1\.4bn · leaves/),
    ).toBeInTheDocument();
    // The child tax allowance is on the next screen, starts in 2028-29 and wears the tag.
    fireEvent.click(screen.getByRole('link', { name: 'Next: Families and child poverty' }));
    const allowance = box(/A child tax allowance/).closest('.choice') as HTMLElement;
    expect(within(allowance).getByText(/Earliest start/)).toBeInTheDocument();
    expect(within(allowance).getByText(/April 2028/)).toBeInTheDocument();
    // The choice made on the screen before is still in the Budget.
    await waitFor(() => expect(L()).toMatch(/rv2ch\.1/));
  });

  it('blocks an option that counts the same money as one already chosen, and says by what', async () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    const gap = () => box(/^Fund the Defence Investment Plan’s gap/);
    const three = () => box(/^Defence at 3% of GDP now/);
    expect(gap()).toBeEnabled();
    fireEvent.click(three());
    await waitFor(() => expect(L()).toMatch(/def3\.1/));
    // The gap is blocked while the 3% option is in: the card is disabled and names the reason.
    expect(gap()).toBeDisabled();
    const gapCard = gap().closest('.choice') as HTMLElement;
    expect(gapCard.className).toMatch(/choice--blocked/);
    expect(
      within(gapCard).getByText('Instead of Defence at 3% of GDP now, not in 2030-31'),
    ).toBeInTheDocument();
    expect(within(gapCard).getByText(/counts some of the same money twice/)).toBeInTheDocument();
    // The 3% option itself is not blocked by the pair it is in.
    expect(three()).toBeEnabled();
    fireEvent.click(three());
    await waitFor(() => expect(L()).not.toMatch(/def3/));
    expect(gap()).toBeEnabled();
    expect(gapCard.className).not.toMatch(/choice--blocked/);
  });

  it('with both sides of a pair in from the desk, both cards warn and neither is blocked', () => {
    at(`/budget/deliver/2?${BASE}&${GAME}&L=def3.1_dip47.1`);
    const gap = box(/^Fund the Defence Investment Plan’s gap/);
    const three = box(/^Defence at 3% of GDP now/);
    expect(gap).toBeEnabled();
    expect(three).toBeEnabled();
    expect(gap).toBeChecked();
    expect(three).toBeChecked();
    expect(
      within(gap.closest('.choice') as HTMLElement).getByText(
        /^Warning: both this and Defence at 3% of GDP now, not in 2030-31 are in your Budget/,
      ),
    ).toBeInTheDocument();
    expect(
      within(three.closest('.choice') as HTMLElement).getByText(
        /^Warning: both this and Fund the Defence Investment Plan’s gap are in your Budget/,
      ),
    ).toBeInTheDocument();
  });

  it('names the options it overlaps before either is chosen, and quotes the interaction once the other moves', () => {
    const cost = 'g=s.7_st.2_pl.adviser_hr.20_pr.cost-of-living';
    const quiet = at(`/budget/deliver?${BASE}&${cost}`);
    const freeze = () => box(/^End the threshold freeze early/).closest('.choice') as HTMLElement;
    // A way to afford moves the basic rate; the two interact, so the card says so, quietly.
    const note = within(freeze()).getByText('Overlaps with Basic rate');
    expect(note.className).not.toMatch(/choice__overlap--warn/);
    quiet.unmount();
    at(`/budget/deliver?${BASE}&${cost}&L=itbr.1`);
    const moved = within(freeze()).getByText(
      /^Overlaps with Basic rate: Both change the income tax base/,
    );
    expect(moved.className).not.toMatch(/choice__overlap--warn/);
  });

  it('opens the desk one link away, at the right group, and comes back to the same screen', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('link', { name: 'More policies: every spending lever' }));
    // The spending desk, with the Justice lever's group open, the briefing folded away, no
    // hand-off, and the line naming it a side room rather than a part of the road.
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Build your Budget · More policies/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(
      /Day-to-day departmental budgets/,
    );
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByText('The Director of Public Spending’s briefing')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Next: the/ })).toBeNull();
    const back = screen.getByRole('link', { name: 'Back to the options for safer streets' });
    expect(back).toHaveAttribute('href', expect.stringMatching(/^\/budget\/deliver\?/));
    fireEvent.click(back);
    expect(h1(/^1st Safer streets/)).toBeInTheDocument();
  });
});
