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
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}
const L = () => new URLSearchParams(window.location.search).get('L') ?? '';
const section = (name: RegExp) => screen.getByRole('group', { name });
const box = (group: RegExp, name: RegExp) => within(section(group)).getByRole('checkbox', { name });

describe('the ways to deliver', () => {
  it('sends a sandbox with no game to the desk, and a game that has not seen the PM back to the PM', () => {
    const sandbox = at(`/budget/deliver?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/Part 1 of 2/)).toBeInTheDocument();
    sandbox.unmount();
    at(`/budget/deliver?${BASE}&g=s.7_st.1_pl.adviser_hr.20`);
    expect(screen.getByText('Agree the priorities with the Prime Minister')).toBeInTheDocument();
  });

  it('opens with the Director’s hand-off, then one section per ranked priority with its lead’s line', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    expect(screen.getByText('Choose how to deliver it')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '1st · Safer streets: prisons, police, borders' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '2nd · Defence on the NATO path' }),
    ).toBeInTheDocument();
    // The Justice Secretary opens safer streets; the Defence Secretary opens defence. Simulated.
    expect(screen.getAllByText('Justice Secretary').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Defence Secretary').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Simulated').length).toBeGreaterThanOrEqual(2);
    // Two ways for safer streets (the game has two levers there), three for defence.
    expect(within(section(/Ways to deliver: Safer streets/)).getAllByRole('checkbox')).toHaveLength(
      2,
    );
    expect(within(section(/Ways to deliver: Defence/)).getAllByRole('checkbox')).toHaveLength(3);
    // Every card carries the engine's figure for choosing it now, and the headroom that would leave;
    // the year is said once, in the hint.
    expect(screen.getAllByText(/Costs £\d+\.\dbn · leaves (−|£)/).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText(/^Figures are for 2029-30/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next: the ways to afford it' })).toBeInTheDocument();
  });

  it('choosing an option moves its levers; putting it back restores them; the strip keeps count', async () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    const strip = screen.getByRole('region', { name: 'Your Budget so far' });
    expect(within(strip).getByText('0 of 2 delivered')).toBeInTheDocument();
    const gap = () => box(/Ways to deliver: Defence/, /^Fund the Defence Investment Plan’s gap/);
    fireEvent.click(gap());
    await waitFor(() => expect(L()).toMatch(/dip47\.1/));
    expect(within(strip).getByText('1 of 2 delivered')).toBeInTheDocument();
    expect(gap()).toBeChecked();
    // Once on, the minister behind the lever reacts, and the card prices what putting it back would
    // undo: the headroom the Budget would have without it.
    expect(screen.getAllByText('Defence Secretary').length).toBeGreaterThanOrEqual(2);
    const card = gap().closest('.choice') as HTMLElement;
    expect(within(card).getByText(/Costs £\d+\.\dbn · without it (−|£)/)).toBeInTheDocument();
    fireEvent.click(gap());
    await waitFor(() => expect(L()).not.toMatch(/dip47/));
    expect(within(strip).getByText('0 of 2 delivered')).toBeInTheDocument();
  });

  it('shows a lever adjusted on the desk as neither on nor off, with where it stands', () => {
    at(`/budget/deliver?${BASE}&${GAME}&L=moj.5`);
    const prisons = box(/Ways to deliver: Safer streets/, /A Justice uplift for prison capacity/);
    expect(prisons).not.toBeChecked();
    const card = prisons.closest('.choice') as HTMLElement;
    expect(within(card).getByText(/Adjusted on the desk/)).toBeInTheDocument();
    expect(card.className).toMatch(/choice--adjusted/);
  });

  it('wears the red lines, the earliest starts and a later start on the options that carry them', async () => {
    at(`/budget/deliver?${BASE}&g=s.7_st.2_pl.adviser_hr.20_pr.welfare-bill+families`);
    const welfare = section(/Ways to deliver: Get the welfare bill down/);
    const twoChild = within(welfare).getByRole('checkbox', {
      name: /Reinstate the two-child limit/,
    });
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
    const insurance = within(welfare)
      .getByRole('checkbox', { name: /Time-limit the new unemployment insurance/ })
      .closest('.choice') as HTMLElement;
    expect(
      within(insurance).getByText(/Nothing until 2030-31, then saves £1\.4bn · leaves/),
    ).toBeInTheDocument();
    // The child tax allowance starts in 2028-29 and wears the tag.
    const families = section(/Ways to deliver: Families and child poverty/);
    const allowance = within(families)
      .getByRole('checkbox', { name: /A child tax allowance/ })
      .closest('.choice') as HTMLElement;
    expect(within(allowance).getByText(/Earliest start/)).toBeInTheDocument();
    expect(within(allowance).getByText(/April 2028/)).toBeInTheDocument();
  });

  it('blocks an option that counts the same money as one already chosen, and says by what', async () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    const defence = /Ways to deliver: Defence/;
    const gap = () => box(defence, /^Fund the Defence Investment Plan’s gap/);
    const three = () => box(defence, /^Defence at 3% of GDP now/);
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
    at(`/budget/deliver?${BASE}&${GAME}&L=def3.1_dip47.1`);
    const defence = /Ways to deliver: Defence/;
    const gap = box(defence, /^Fund the Defence Investment Plan’s gap/);
    const three = box(defence, /^Defence at 3% of GDP now/);
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
    const freeze = () =>
      box(/Ways to deliver: Cut the cost of living/, /^End the threshold freeze early/).closest(
        '.choice',
      ) as HTMLElement;
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

  it('opens the desk one link away, at the right group, with a way back to the options', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    const safer = screen
      .getByRole('heading', { name: /Safer streets/ })
      .closest('section') as HTMLElement;
    fireEvent.click(within(safer).getByRole('link', { name: /Adjust the details/ }));
    // The spending desk, with the Justice lever's group open and the briefing folded away.
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(
      /Day-to-day departmental budgets/,
    );
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByText('The Director of Public Spending’s briefing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the ways to deliver' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Next: the/ })).toBeNull();
  });
});
