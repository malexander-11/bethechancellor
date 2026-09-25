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
const G = `s.${ADVISER}_st.5_pl.adviser_hr.20_pr.nhs+schools-send_rv.1`;
const MACRO = 'M=rate.0.75_rpi.0.5';

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
const menu = () => screen.getByRole('group', { name: 'The add-ons' });
const box = (name: RegExp) => within(menu()).getByRole('checkbox', { name });

describe('suggested little add-ons', () => {
  it('sends a game that has not opened the envelope to the forecast', () => {
    at(`/rabbit?${BASE}&g=s.${ADVISER}_st.3`);
    expect(screen.getByText('The OBR’s forecast arrives')).toBeInTheDocument();
  });

  it('prices every suggestion as the headroom it would leave', () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const cards = within(menu()).getAllByRole('checkbox');
    // Eight little add-ons, one priority to go further on, and keeping the headroom.
    expect(cards).toHaveLength(10);
    expect(within(menu()).getAllByText(/leaves (−|£)/).length).toBe(10);
    expect(within(menu()).getByText(/costs nothing/)).toBeInTheDocument();
    const pubs = box(/Five per cent off alcohol duty/).closest('label') as HTMLElement;
    expect(within(pubs).getByText(/costs £\d+\.\dbn/)).toBeInTheDocument();
    expect(within(pubs).getByText('Political Adviser')).toBeInTheDocument();
    expect(screen.getByText(/0 of 3 chosen/)).toBeInTheDocument();
  });

  it('takes up to three, no more, and puts each back when it is unticked', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    fireEvent.click(box(/Fuel duty cut by 5%/));
    await waitFor(() => {
      expect(L()).toMatch(/fuel\.-5/);
      expect(g()).toMatch(/rb\.fuel-cut/);
    });
    fireEvent.click(box(/Five per cent off alcohol duty/));
    fireEvent.click(box(/Keep the £2 bus fare cap/));
    await waitFor(() => expect(g()).toMatch(/rb\.fuel-cut\+pubs\+keep-bus-cap/));
    expect(screen.getByText(/3 of 3 chosen/)).toBeInTheDocument();
    expect(box(/AI retraining/)).toBeDisabled();
    fireEvent.click(box(/Five per cent off alcohol duty/));
    await waitFor(() => {
      expect(L()).not.toMatch(/alc/);
      expect(g()).toMatch(/rb\.fuel-cut\+keep-bus-cap/);
    });
    expect(box(/AI retraining/)).toBeEnabled();
  });

  it('keeping the headroom is exclusive: every add-on goes back where it was', async () => {
    at(`/rabbit?${BASE}&g=${G}_rb.fuel-cut+pubs&${MACRO}&L=dhsc.3_fuel.-5_alc.-5`);
    fireEvent.click(box(/Keep the headroom/));
    await waitFor(() => {
      expect(g()).toMatch(/rb\.keep(_|$)/);
      expect(L()).toBe('dhsc.3');
    });
  });

  it('goes one notch further on a delivered priority, and back when unticked', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    fireEvent.click(box(/Go further on Bring down NHS waiting lists/));
    await waitFor(() => {
      expect(L()).toMatch(/dhsc\.3\.5/);
      expect(g()).toMatch(/rb\.further:nhs/);
    });
    fireEvent.click(box(/Go further on Bring down NHS waiting lists/));
    await waitFor(() => {
      expect(L()).toMatch(/dhsc\.3(_|$)/);
      expect(g()).not.toMatch(/rb\./);
    });
  });

  it('will not offer as a surprise something already in the Budget', () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3_ufsm.1`);
    const meals = box(/Free school meals/);
    expect(meals).toBeDisabled();
    expect(
      within(meals.closest('label') as HTMLElement).getByText('already in your Budget'),
    ).toBeInTheDocument();
  });
});
