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
const G = `s.${ADVISER}_st.5_pl.adviser_hr.20_th.public-services_pr.nhs-above-sr+send-settlement_rv.1`;
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

describe('something for the speech', () => {
  it('sends a game that has not opened the envelope to the forecast', () => {
    at(`/rabbit?${BASE}&g=s.${ADVISER}_st.2`);
    expect(screen.getByText('The OBR’s forecast arrives')).toBeInTheDocument();
  });

  it('prices every prepared announcement as the headroom it would leave', () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const menu = screen.getByRole('radiogroup', { name: 'The rabbit' });
    const cards = within(menu).getAllByRole('radio');
    // Four prepared announcements, one flagship to go further on, and keeping the headroom.
    expect(cards).toHaveLength(6);
    expect(within(menu).getAllByText(/headroom after:/).length).toBe(6);
    expect(within(menu).getByText(/costs nothing/)).toBeInTheDocument();
    const penny = within(menu)
      .getByRole('radio', { name: /penny off the basic rate/ })
      .closest('label');
    expect(within(penny as HTMLElement).getByText(/costs £\d+\.\dbn/)).toBeInTheDocument();
    expect(within(penny as HTMLElement).getByText('Political Adviser')).toBeInTheDocument();
  });

  it('pulls a rabbit out, and puts it back when another is chosen', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const menu = screen.getByRole('radiogroup', { name: 'The rabbit' });
    fireEvent.click(within(menu).getByRole('radio', { name: /penny off the basic rate/ }));
    await waitFor(() => {
      expect(L()).toMatch(/itbr\.-1/);
      expect(g()).toMatch(/rb\.penny-off/);
    });
    fireEvent.click(within(menu).getByRole('radio', { name: /Keep the headroom/ }));
    await waitFor(() => {
      expect(L()).not.toMatch(/itbr/);
      expect(g()).toMatch(/rb\.keep/);
    });
  });

  it('goes one notch further on a funded flagship, and back to the target when swapped', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const menu = screen.getByRole('radiogroup', { name: 'The rabbit' });
    fireEvent.click(within(menu).getByRole('radio', { name: /Go further on Health above/ }));
    await waitFor(() => {
      expect(L()).toMatch(/dhsc\.3\.5/);
      expect(g()).toMatch(/rb\.flagship:nhs-above-sr/);
    });
    fireEvent.click(within(menu).getByRole('radio', { name: /AI retraining/ }));
    await waitFor(() => {
      expect(L()).toMatch(/dhsc\.3(_|$)/);
      expect(L()).toMatch(/airet\.1/);
    });
  });

  it('will not offer as a surprise something already in the Budget', () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3_ufsm.1`);
    const menu = screen.getByRole('radiogroup', { name: 'The rabbit' });
    const meals = within(menu).getByRole('radio', { name: /Free school meals/ });
    expect(meals).toBeDisabled();
    expect(
      within(meals.closest('label') as HTMLElement).getByText('already in your Budget'),
    ).toBeInTheDocument();
  });
});
