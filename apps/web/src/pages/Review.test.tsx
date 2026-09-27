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
/** Two priorities, the forecast open, the pub add-on chosen, at the final choices. */
const G = `g=s.${ADVISER}_st.5_pl.adviser_hr.20_pr.safer-streets+defence_rv.1_rb.pubs&M=rate.0.75_rpi.0.5`;

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const part = (name: RegExp) => screen.getByRole('region', { name });
const changeIn = (region: HTMLElement, name: string) => within(region).getByRole('link', { name });

describe('the review before delivery', () => {
  it('sends a game that has not made its final choices back to where it is', () => {
    at(`/review?${BASE}&g=s.${ADVISER}_st.4_pl.adviser_hr.20_pr.defence_rv.1&M=rate.0.75_rpi.0.5`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Will you raise more tax?' }),
    ).toBeInTheDocument();
  });

  it('reads the Budget back, part by part, each with a way to change it', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_hscl.1_alc.-5_dfe.5&S=moj.10_dip47.1_hscl.1`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your Budget, reviewed' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Final choices · 2 of 2$/)).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();

    const priorities = part(/^Your priorities/);
    expect(within(priorities).getByText(/Safer streets: prisons, police, borders/)).toBeVisible();
    expect(within(priorities).getByText(/Defence on the NATO path/)).toBeVisible();
    expect(changeIn(priorities, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );

    const deliver = part(/^What you chose to deliver/);
    expect(within(deliver).getByText(/More money for prisons and courts/)).toBeInTheDocument();
    expect(
      within(deliver).getByText(/Fill the funding gap in the defence investment plan/),
    ).toBeInTheDocument();
    expect(within(deliver).getAllByText(/costs £\d\.\dbn/).length).toBe(2);
    expect(changeIn(deliver, 'Change safer streets')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    expect(changeIn(deliver, 'Change defence')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );

    // Every tax moved, under its plain title, with what it raises.
    const tax = part(/^Tax/);
    expect(
      within(tax).getByText(/^Bring back the health and social care levy/),
    ).toBeInTheDocument();
    expect(within(tax).getByText(/raises £1\d\.\dbn/)).toBeInTheDocument();
    expect(changeIn(tax, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );

    // Every other budget moved that no flagship owns, with where it now stands and its cost.
    const spending = part(/^Spending/);
    expect(within(spending).getByText(/^Schools and education · \+5%/)).toBeInTheDocument();
    expect(within(spending).getByText(/costs £\d\.\dbn/)).toBeInTheDocument();
    // The flagships' levers are read back once, as flagships; the add-on once, for the speech.
    expect(within(spending).queryByText(/Prisons and courts/)).toBeNull();
    expect(within(tax).queryByText(/lcohol/)).toBeNull();
    expect(changeIn(spending, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );

    const speech = part(/^For the speech/);
    expect(within(speech).getByText(/alcohol duty/i)).toBeInTheDocument();
    expect(changeIn(speech, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/rabbit\?/),
    );

    const position = part(/^Where that leaves you/);
    expect(within(position).getByText(/Rules met/)).toBeInTheDocument();
    // Since the forecast: education up and the alcohol cut, neither in the snapshot.
    expect(within(position).getByText(/^Education.*→/)).toBeInTheDocument();
    // The add-on is listed once, under the speech, not again as a move since the forecast.
    expect(within(position).queryByText(/^Alcohol.*→/)).toBeNull();
    expect(changeIn(position, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/compromise\/3\?/),
    );
  });

  it('says so when no tax or other budget moved, no add-on, and nothing since the forecast', () => {
    at(`/review?${BASE}&${G.replace('_rb.pubs', '')}&L=moj.10&S=moj.10`);
    expect(within(part(/^Tax/)).getByText('No tax changed.')).toBeInTheDocument();
    expect(within(part(/^Spending/)).getByText('No other budget changed.')).toBeInTheDocument();
    expect(screen.getByText('No add-ons.')).toBeInTheDocument();
    expect(screen.getByText(/Nothing changed since the OBR saw the package/)).toBeInTheDocument();
  });

  it('delivers: the red button marks the game finished and opens Budget day with the Budget intact', async () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_alc.-5`);
    const deliver = screen.getByRole('link', { name: 'Deliver my Budget' });
    expect(deliver.className).toMatch(/btn--budget/);
    fireEvent.click(deliver);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('g')).toMatch(/st\.6/);
      expect(params.get('L')).toMatch(/moj\.10/);
    });
  });
});
