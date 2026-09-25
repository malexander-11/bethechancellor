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

describe('making it add up', () => {
  it('sends a game that has not opened the envelope to the forecast, and no game to the outlook', () => {
    const first = at(`/compromise?${BASE}&g=s.${ADVISER}_st.3`);
    expect(screen.getByText('The OBR’s forecast arrives')).toBeInTheDocument();
    first.unmount();
    at(`/compromise?${BASE}`);
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
  });

  it('states the gap against the target, and ranks the Director of Tax’s suggestions', async () => {
    // The ways to afford it that out-yield every rate rise are already chosen, so the Director's
    // list reaches the rate rises the manifesto lock covers; an option already on is not offered
    // again.
    at(`/compromise?${BASE}&${GAME}&L=moj.10_dip47.1_nicpen.1_pens20.1_cgtalign.1_wealth2.1`);
    expect(screen.getByText(/you set out to keep/)).toBeInTheDocument();
    // The stress test: the package under every forecast the draw could have produced.
    fireEvent.click(screen.getByText(/hold up under the other forecasts/));
    const stress = screen.getByText(/hold up under the other forecasts/).closest('details');
    expect(within(stress as HTMLElement).getAllByRole('listitem')).toHaveLength(5);
    expect(within(stress as HTMLElement).getByText('what arrived')).toBeInTheDocument();
    const route = screen.getByRole('region', { name: /Raise more revenue/ });
    const buttons = within(route).getAllByRole('button', { name: 'Do it' });
    expect(buttons).toHaveLength(3);
    expect(within(route).getAllByText(/breaks The tax lock/).length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);
    // The biggest yield in the package is applied, whichever tax it is; the package grows by one.
    await waitFor(() => expect(L().split('_')).toHaveLength(7));
  });

  it('delays a measure to a later year and writes the delay into the link', async () => {
    at(`/compromise?${BASE}&${GAME}&L=moj.10_dip47.1`);
    const select = screen.getByLabelText('Start year for Justice');
    fireEvent.change(select, { target: { value: '2028-29' } });
    await waitFor(() => expect(g()).toMatch(/dl\.moj-2028/));
    expect(screen.getByText(/starts 2028-29/)).toBeInTheDocument();
  });

  it('lists what was chosen to deliver, with a later start, half the distance, or dropped', async () => {
    at(`/compromise?${BASE}&${GAME}&L=moj.10_dip47.1`);
    const route = screen.getByRole('region', { name: /Spend less, or later/ });
    // Two chosen options, each named as the option, each with a way out; only the slider halves.
    expect(within(route).getByText('A Justice uplift for prison capacity')).toBeInTheDocument();
    expect(within(route).getByText('Fund the Defence Investment Plan’s gap')).toBeInTheDocument();
    expect(within(route).getAllByRole('button', { name: 'Drop it' })).toHaveLength(2);
    expect(within(route).getAllByRole('button', { name: 'Narrow it' })).toHaveLength(1);
    fireEvent.click(within(route).getByRole('button', { name: 'Narrow it' }));
    await waitFor(() => expect(L()).toMatch(/moj\.5/));
    // Half-delivered now: still listed, adjusted, with no second halving on offer.
    expect(within(route).getByText(/adjusted on the desk/)).toBeInTheDocument();
    expect(within(route).queryByRole('button', { name: 'Narrow it' })).toBeNull();
    // Dropping it puts the lever back where the OBR had it; the other option is untouched.
    const prisons = within(route)
      .getByText('A Justice uplift for prison capacity')
      .closest('li') as HTMLElement;
    fireEvent.click(within(prisons).getByRole('button', { name: 'Drop it' }));
    await waitFor(() => expect(L()).not.toMatch(/moj/));
    expect(L()).toMatch(/dip47\.1/);
  });

  it('keeps a spending measure moved on the desk in the list, after the chosen options', () => {
    at(`/compromise?${BASE}&${GAME}&L=moj.10_dfe.5`);
    const route = screen.getByRole('region', { name: /Spend less, or later/ });
    const rows = within(route).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/A Justice uplift for prison capacity/);
    expect(rows[1]).toHaveTextContent(/Education/);
    expect(rows[1]).toHaveTextContent(/moved on the desk/);
  });

  it('lets the Chancellor lower the target, and says what that costs', async () => {
    at(`/compromise?${BASE}&${GAME}&L=moj.10_dip47.1`);
    const route = screen.getByRole('region', { name: /Accept less headroom/ });
    expect(within(route).getByText(/Lowering the target costs nothing today/)).toBeInTheDocument();
    fireEvent.click(within(route).getByRole('radio', { name: /Whatever the rules leave/ }));
    await waitFor(() => expect(g()).toMatch(/hr\.0/));
    expect(screen.getByText(/you set no target beyond the rules/)).toBeInTheDocument();
  });

  it('offers a conscious breach only when a rule is missed, and records the acknowledgement', async () => {
    at(`/compromise?${BASE}&${GAME}&L=dhsc.10_dfe.10_moj.10`);
    const route = screen.getByRole('region', { name: /Borrow, and say so/ });
    const box = within(route).getByRole('checkbox');
    expect(within(route).getByText(/will be missed by £/)).toBeInTheDocument();
    expect(within(route).getByText(/Write down that you know/)).toBeInTheDocument();
    fireEvent.click(box);
    await waitFor(() => expect(g()).toMatch(/br\.1/));
  });

  it('offers no borrowing route when the rules are met, only a line saying so', () => {
    at(`/compromise?${BASE}&${GAME}&L=moj.10`);
    expect(screen.queryByRole('region', { name: /Borrow, and say so/ })).toBeNull();
    expect(screen.getByText(/No rule is missed on these numbers/)).toBeInTheDocument();
    // The manifesto is not a route either: there is no going back to the Prime Minister, and
    // scaling back what was chosen lives inside "spend less, or later".
    expect(screen.queryByRole('region', { name: /Prime Minister/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /Scale back/ })).toBeNull();
    expect(screen.getByRole('region', { name: /Spend less, or later/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3 · Accept less headroom' })).toBeInTheDocument();
  });
});
