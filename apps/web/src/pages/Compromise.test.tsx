import { pickOutcome, SEED_MAX, SEED_MIN } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { draws } from '../data';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}
const ADVISER = seedFor('adviser-right');
const G = `s.${ADVISER}_st.4_pl.adviser_hr.30_pr.defence+safer-streets_rv.1`;
const GAME = `g=${G}&M=rate.0.75_rpi.0.5`;
// Two priorities, a £20bn target, and one way to pay that leaves the Budget over the target with
// every rule met: the screens offer ways to use the room, not ways out.
const SURPLUS = `g=s.${ADVISER}_st.4_pl.adviser_hr.20_pr.defence+safer-streets_rv.1&M=rate.0.75_rpi.0.5`;

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const g = () => new URLSearchParams(window.location.search).get('g') ?? '';
const L = () => new URLSearchParams(window.location.search).get('L') ?? '';
const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name });
const primary = () => document.querySelector('main .btn--primary') as HTMLElement;
const back = () => screen.getByRole('link', { name: 'Back' });

describe('the sums, one question a screen', () => {
  it('sends a game that has not opened the envelope to the forecast, and no game to the outlook', () => {
    const first = at(`/compromise?${BASE}&g=s.${ADVISER}_st.3`);
    expect(h1('The forecast arrives')).toBeInTheDocument();
    first.unmount();
    at(`/compromise?${BASE}`);
    expect(screen.getByText('Your starting position')).toBeInTheDocument();
  });

  it('lands a screen number beyond the three on the last, and "1" on the bare route', () => {
    const far = at(`/compromise/9?${BASE}&${GAME}&L=moj.10_dip47.1`);
    expect(h1('Will you keep less headroom?')).toBeInTheDocument();
    far.unmount();
    at(`/compromise/1?${BASE}&${GAME}&L=moj.10_dip47.1`);
    expect(h1('Will you raise more tax?')).toBeInTheDocument();
    expect(back()).toHaveAttribute('href', expect.stringMatching(/^\/forecast\?/));
  });

  it('asks about tax first: the gap on the bar, the Director of Tax’s three suggestions, nothing else', async () => {
    // The ways to afford it that out-yield every rate rise are already chosen, so the Director's
    // list reaches the rate rises the manifesto lock covers; an option already on is not offered
    // again. The spending keeps the Budget short of its £30bn target, so the screens are the sums.
    at(
      `/compromise?${BASE}&${GAME}&L=moj.10_dip47.1_nicpen.1_pens20.1_cgtalign.1_wealth2.1_hscl.1_dhsc.10_dfe.10_otherd.10_mod.10_home.10_wpens.5`,
    );
    expect(h1('Will you raise more tax?')).toBeInTheDocument();
    expect(screen.getByText('Start with taxes. Spending comes next.')).toBeInTheDocument();
    expect(screen.getByText(/^Respond to the forecast · 2 of 4$/)).toBeInTheDocument();
    // The gap is said once, on the bar.
    expect(screen.getByText(/short of your £30bn target/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'The gap' })).toBeNull();
    // Spending, the target and the stress test wait for their own screens.
    expect(screen.queryByRole('region', { name: /spend less/ })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Headroom target' })).toBeNull();
    expect(screen.queryByText(/hold up under the other forecasts/)).toBeNull();
    const route = screen.getByRole('region', { name: /raise more tax/ });
    const buttons = within(route).getAllByRole('button', { name: 'Do it' });
    expect(buttons).toHaveLength(3);
    expect(within(route).getAllByText(/breaks The tax lock/).length).toBeGreaterThan(0);
    expect(primary()).toHaveTextContent('Next: spending');
    expect(primary()).toHaveAttribute('href', expect.stringMatching(/^\/compromise\/2\?/));
    fireEvent.click(buttons[0]!);
    // The biggest yield in the package is applied, whichever tax it is; the package grows by one.
    await waitFor(() => expect(L().split('_')).toHaveLength(14));
  });

  it('asks about spending second: delays a measure to a later year and writes the delay into the link', async () => {
    at(`/compromise/2?${BASE}&${GAME}&L=moj.10_dip47.1`);
    expect(h1('Will you spend less, or later?')).toBeInTheDocument();
    expect(screen.getByText(/^Respond to the forecast · 3 of 4$/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /raise more tax/ })).toBeNull();
    const select = screen.getByLabelText('Start year for Justice');
    fireEvent.change(select, { target: { value: '2028-29' } });
    await waitFor(() => expect(g()).toMatch(/dl\.moj-2028/));
    expect(screen.getByText(/starts 2028-29/)).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Next: headroom');
    expect(primary()).toHaveAttribute('href', expect.stringMatching(/^\/compromise\/3\?/));
    expect(back()).toHaveAttribute('href', expect.stringMatching(/^\/compromise\?/));
  });

  it('lists what was chosen to deliver, with a later start, half the distance, or dropped', async () => {
    at(`/compromise/2?${BASE}&${GAME}&L=moj.10_dip47.1`);
    const route = screen.getByRole('region', { name: /spend less, or later/ });
    // Two chosen options, each named as the option, each with a way out; only the slider halves.
    expect(within(route).getByText('More money for prisons and courts')).toBeInTheDocument();
    expect(
      within(route).getByText('Fill the funding gap in the defence investment plan'),
    ).toBeInTheDocument();
    expect(within(route).getAllByRole('button', { name: 'Drop it' })).toHaveLength(2);
    expect(within(route).getAllByRole('button', { name: 'Narrow it' })).toHaveLength(1);
    fireEvent.click(within(route).getByRole('button', { name: 'Narrow it' }));
    await waitFor(() => expect(L()).toMatch(/moj\.5/));
    // Half-delivered now: still listed, adjusted, with no second halving on offer.
    expect(within(route).getByText(/adjusted on the desk/)).toBeInTheDocument();
    expect(within(route).queryByRole('button', { name: 'Narrow it' })).toBeNull();
    // Dropping it puts the lever back where the OBR had it; the other option is untouched.
    const prisons = within(route)
      .getByText('More money for prisons and courts')
      .closest('li') as HTMLElement;
    fireEvent.click(within(prisons).getByRole('button', { name: 'Drop it' }));
    await waitFor(() => expect(L()).not.toMatch(/moj/));
    expect(L()).toMatch(/dip47\.1/);
  });

  it('keeps a spending measure moved on the desk in the list, after the chosen options', () => {
    at(`/compromise/2?${BASE}&${GAME}&L=moj.10_dfe.5`);
    const route = screen.getByRole('region', { name: /spend less, or later/ });
    const rows = within(route).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/More money for prisons and courts/);
    expect(rows[1]).toHaveTextContent(/Education/);
    expect(rows[1]).toHaveTextContent(/moved on the desk/);
  });

  it('asks about headroom last: the target, the stress test, and a lower target that leaves room to spare', async () => {
    at(`/compromise/3?${BASE}&${GAME}&L=moj.10_dip47.1`);
    expect(h1('Will you keep less headroom?')).toBeInTheDocument();
    expect(screen.getByText(/^Respond to the forecast · 4 of 4$/)).toBeInTheDocument();
    // The adviser's line is folded under their name: the full line, once.
    expect(screen.getAllByText(/Lowering the target costs nothing today/).length).toBe(1);
    // The stress test: the package under every forecast the draw could have produced.
    fireEvent.click(screen.getByText(/hold up under the other forecasts/));
    const stress = screen.getByText(/hold up under the other forecasts/).closest('details');
    expect(within(stress as HTMLElement).getAllByRole('listitem')).toHaveLength(5);
    expect(within(stress as HTMLElement).getByText('what arrived')).toBeInTheDocument();
    expect(primary()).toHaveTextContent('Next: final choices');
    expect(primary()).toHaveAttribute('href', expect.stringMatching(/^\/rabbit\?/));
    expect(back()).toHaveAttribute('href', expect.stringMatching(/^\/compromise\/2\?/));
    fireEvent.click(screen.getByRole('radio', { name: /Whatever the rules leave/ }));
    await waitFor(() => expect(g()).toMatch(/hr\.0/));
    expect(screen.getByText(/no target beyond the rules/)).toBeInTheDocument();
    // With no target and every rule met the Budget has room to spare: the same screen, the
    // other mood's question.
    expect(h1('Will you keep the extra headroom?')).toBeInTheDocument();
  });

  it('offers a conscious breach only when a rule is missed, and records the acknowledgement', async () => {
    at(`/compromise/3?${BASE}&${GAME}&L=dhsc.10_dfe.10_moj.10`);
    expect(screen.getByText(/^A rule is missed on these numbers/)).toBeInTheDocument();
    const route = screen.getByRole('region', { name: /borrow, and say so/ });
    const box = within(route).getByRole('checkbox');
    expect(within(route).getByText(/will be missed by £/)).toBeInTheDocument();
    expect(within(route).getAllByText(/Write down that you know/).length).toBe(1);
    fireEvent.click(box);
    await waitFor(() => expect(g()).toMatch(/br\.1/));
  });

  it('offers no borrowing route when the rules are met, only the target', () => {
    at(`/compromise/3?${BASE}&${GAME}&L=moj.10`);
    expect(screen.queryByRole('region', { name: /borrow, and say so/ })).toBeNull();
    // With every rule met, nothing says so twice: the bar is silent and the aside is gone.
    expect(screen.queryByText(/No rule is missed on these numbers/)).toBeNull();
    // The manifesto is not a route either: there is no going back to the Prime Minister, and
    // scaling back what was chosen lives on the spending screen.
    expect(screen.queryByRole('region', { name: /Prime Minister/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /Scale back/ })).toBeNull();
    expect(screen.getByRole('radiogroup', { name: 'Headroom target' })).toBeInTheDocument();
    expect(
      screen.getByText('Your target is yours to change. The rules are not.'),
    ).toBeInTheDocument();
  });
});

describe('room to spare, one question a screen', () => {
  it('asks first about the priorities: the ways to deliver them, one per priority first, and does one', async () => {
    at(`/compromise?${BASE}&${SURPLUS}&L=hscl.1`);
    expect(h1('Will you do more for your priorities?')).toBeInTheDocument();
    expect(screen.getByText(/over your £20bn target/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /raise more tax/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /spend less/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /borrow, and say so/ })).toBeNull();
    expect(screen.queryByText(/No rule is missed on these numbers/)).toBeNull();
    const more = screen.getByRole('region', { name: /do more for your priorities/ });
    const rows = within(more).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(/for defence/);
    expect(rows[1]).toHaveTextContent(/More money for prisons and courts/);
    // Each priced against the Budget as it stands, with the headroom it would leave.
    expect(within(more).getAllByText(/^leaves £/)).toHaveLength(3);
    expect(within(more).getAllByText(/^Costs £/).length).toBeGreaterThan(0);
    expect(primary()).toHaveTextContent('Next: tax');
    fireEvent.click(within(more).getAllByRole('button', { name: 'Do it' })[0]!);
    await waitFor(() => expect(L().split('_')).toHaveLength(2));
    expect(L()).toMatch(/dip47\.1/);
  });

  it('asks second about easing a tax rise, and follows the headroom into the sums when dropping it leaves a gap', async () => {
    at(`/compromise/2?${BASE}&${SURPLUS}&L=hscl.1`);
    expect(h1('Will you ease off a tax rise?')).toBeInTheDocument();
    const ease = screen.getByRole('region', { name: /ease off/ });
    expect(
      within(ease).getByText('Bring back the health and social care levy'),
    ).toBeInTheDocument();
    expect(within(ease).getByText(/dropped: −£/)).toBeInTheDocument();
    expect(within(ease).getAllByText(/the headroom that dropping it would leave/).length).toBe(1);
    fireEvent.click(within(ease).getByRole('button', { name: 'Drop it' }));
    await waitFor(() => expect(L()).not.toMatch(/hscl/));
    // The only way to pay is gone and the Budget is short again: the same screen, in the sums'
    // mood, with its own question.
    expect(h1('Will you spend less, or later?')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /spend less, or later/ })).toBeInTheDocument();
    expect(screen.getByText(/^Respond to the forecast · 3 of 4$/)).toBeInTheDocument();
  });

  it('says when there is nothing to ease, and lets the Chancellor bank the room by raising the target', async () => {
    const NO_TARGET = `g=s.${ADVISER}_st.4_pl.adviser_hr.0_pr.defence_rv.1&M=rate.0.75_rpi.0.5`;
    const quiet = at(`/compromise/2?${BASE}&${NO_TARGET}`);
    expect(screen.getByText(/nothing to ease/)).toBeInTheDocument();
    quiet.unmount();
    at(`/compromise/3?${BASE}&${NO_TARGET}`);
    expect(h1('Will you keep the extra headroom?')).toBeInTheDocument();
    expect(screen.getByText(/no target beyond the rules/)).toBeInTheDocument();
    // The adviser's line is folded under their name: the full line, once.
    expect(screen.getAllByText(/Money not spent is the cheapest insurance/).length).toBe(1);
    fireEvent.click(screen.getByRole('radio', { name: /£30bn/ }));
    await waitFor(() => expect(g()).toMatch(/hr\.30/));
    // Short of the new target: the sums again, on the same screen, and no rule is missed.
    expect(h1('Will you keep less headroom?')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /borrow, and say so/ })).toBeNull();
  });
});
