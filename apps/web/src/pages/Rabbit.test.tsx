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

  it('prices every suggestion against the Budget as it stands, as the headroom it would leave', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const cards = within(menu()).getAllByRole('checkbox');
    // Eight little add-ons, one priority to go further on, and keeping the headroom.
    expect(cards).toHaveLength(10);
    expect(within(menu()).getAllByText(/leaves (−|£)/).length).toBe(10);
    expect(within(menu()).getByText(/^Costs nothing · leaves/)).toBeInTheDocument();
    const pubs = box(/Five per cent off alcohol duty/).closest('label') as HTMLElement;
    expect(within(pubs).getByText(/^Costs £\d+\.\dbn · leaves (−|£)/)).toBeInTheDocument();
    expect(within(pubs).getByText('Political Adviser')).toBeInTheDocument();
    expect(
      screen.getByText(/priced against your Budget in 2029-30\. 0 of 3 chosen/),
    ).toBeInTheDocument();
    // Ticked, the card says what the Budget would have without it.
    fireEvent.click(box(/Five per cent off alcohol duty/));
    await waitFor(() => expect(g()).toMatch(/rb\.pubs/));
    expect(within(pubs).getByText(/^Costs £\d+\.\dbn · without it (−|£)/)).toBeInTheDocument();
  });

  it('names the option an add-on overlaps, and quotes the interaction once that option is in', () => {
    const quiet = at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    const electricity = () => box(/Keep VAT off electricity/).closest('.choice') as HTMLElement;
    expect(
      within(electricity()).getByText('Overlaps with Take VAT off gas as well as electricity'),
    ).toBeInTheDocument();
    quiet.unmount();
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3_vatgas.1`);
    expect(
      within(electricity()).getByText(
        /^Overlaps with Take VAT off gas as well as electricity: The gas card’s arithmetic/,
      ),
    ).toBeInTheDocument();
  });

  it('takes up to three, no more, and puts each back when it is unticked', async () => {
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3`);
    fireEvent.click(box(/Half a per cent more for pensioners/));
    await waitFor(() => {
      expect(L()).toMatch(/wpens\.0\.5/);
      expect(g()).toMatch(/rb\.pensioners-half/);
    });
    fireEvent.click(box(/Five per cent off alcohol duty/));
    fireEvent.click(box(/Transport’s day-to-day budget up 5%/));
    await waitFor(() => expect(g()).toMatch(/rb\.pensioners-half\+pubs\+transport-up/));
    expect(screen.getByText(/3 of 3 chosen/)).toBeInTheDocument();
    expect(box(/Keep VAT off electricity/)).toBeDisabled();
    fireEvent.click(box(/Five per cent off alcohol duty/));
    await waitFor(() => {
      expect(L()).not.toMatch(/alc/);
      expect(g()).toMatch(/rb\.pensioners-half\+transport-up/);
    });
    expect(box(/Keep VAT off electricity/)).toBeEnabled();
  });

  it('keeping the headroom is exclusive: every add-on goes back where it was', async () => {
    at(`/rabbit?${BASE}&g=${G}_rb.pensioners-half+pubs&${MACRO}&L=dhsc.3_wpens.0.5_alc.-5`);
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

  it('will not offer as a surprise something already moved on the desk', () => {
    // No add-on shares a lever with another option, so only the desk can pre-empt one.
    at(`/rabbit?${BASE}&g=${G}&${MACRO}&L=dhsc.3_alc.-5`);
    const pubs = box(/Five per cent off alcohol duty/);
    expect(pubs).toBeDisabled();
    expect(
      within(pubs.closest('label') as HTMLElement).getByText('already in your Budget'),
    ).toBeInTheDocument();
  });
});
