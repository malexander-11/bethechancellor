import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** Two priorities agreed, fine-tuning done, on today's estimate: at the review. */
const G = 'g=st.4_pr.safer-streets+defence&M=rate.0.75_rpi.0.5';

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

describe('step 5: deliver the Budget', () => {
  it('sends a game that has not finished fine-tuning back to where it is', () => {
    at(`/review?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(screen.getByRole('heading', { level: 1, name: 'Fine-tune tax' })).toBeInTheDocument();
  });

  it('reads the Budget back, part by part, each with a way to change it', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_hscl.1_dfe.5`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deliver your Budget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();

    const priorities = part(/^Your priorities/);
    expect(within(priorities).getByText(/Safer streets: prisons, police, borders/)).toBeVisible();
    expect(within(priorities).getByText(/Defence on the NATO path/)).toBeVisible();
    expect(changeIn(priorities, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );

    const flagships = part(/^Flagship policies/);
    expect(within(flagships).getByText(/More money for prisons and courts/)).toBeInTheDocument();
    expect(
      within(flagships).getByText(/Fill the funding gap in the defence investment plan/),
    ).toBeInTheDocument();
    expect(within(flagships).getAllByText(/costs £\d\.\dbn/).length).toBe(2);
    expect(changeIn(flagships, 'Change safer streets')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    expect(changeIn(flagships, 'Change defence')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );

    // Every tax moved, under its plain title, with what it raises.
    const tax = part(/^Tax/);
    expect(
      within(tax).getByText(/^Bring back the health and social care levy/),
    ).toBeInTheDocument();
    expect(within(tax).getByText(/raises £2\d\.\dbn/)).toBeInTheDocument();
    expect(changeIn(tax, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );

    // Every other budget moved that no flagship owns, with where it now stands and its cost.
    const spending = part(/^Spending/);
    // A spending line in the card's words: its share against the plan (Phase 25).
    expect(within(spending).getByText(/^Schools and education · 5% more/)).toBeInTheDocument();
    expect(within(spending).getByText(/costs £\d\.\dbn/)).toBeInTheDocument();
    // The flagships' levers are read back once, as flagships.
    expect(within(spending).queryByText(/Prisons and courts/)).toBeNull();
    expect(changeIn(spending, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );

    // Where that leaves you: from the estimate to the bar, and who pays most (Phase 25).
    const position = part(/^Where that leaves you/);
    expect(
      within(position).getByText(
        /^Headroom goes from £6\.8bn to £\d+\.\dbn in 2029-30\. Taxes raise £\d+\.\dbn; day-to-day spending adds £\d+\.\dbn net; less borrowing saves £\d\.\dbn in interest\./,
      ),
    ).toBeInTheDocument();
    expect(
      within(position).getByText(
        /^Who pays most: everyone who earns or spends, £\d+\.\dbn in 2029-30\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(position).getByText('You meet both fiscal rules.')).toBeInTheDocument();
    // The levy keeps the tax lock's words and strains its spirit: amber, not red.
    expect(within(position).getByText('Strains the manifesto: The tax lock')).toHaveClass(
      'tag--amber',
    );
    expect(changeIn(position, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    // Nothing of the retired steps is left: no speech, no forecast, no target.
    expect(screen.queryByRole('region', { name: /For the speech/ })).toBeNull();
    expect(screen.queryByText(/Since the forecast/)).toBeNull();
    expect(screen.queryByText(/target/)).toBeNull();
  });

  it('lists what is still on the desk, and says a thin margin is thin (Phase 25)', () => {
    const thin = at(`/review?${BASE}&${G}&L=moj.10`);
    let position = part(/^Where that leaves you/);
    expect(
      within(position).getByText(/Your advisers call headroom under £10bn thin/),
    ).toBeInTheDocument();
    expect(within(position).getByText('Still on your desk:')).toBeInTheDocument();
    expect(within(position).getByText(/The defence plan’s last £4\.7bn/)).toBeInTheDocument();
    expect(
      within(position).getByText(/VAT on home electricity goes back to 5% in April 2027/),
    ).toBeInTheDocument();
    thin.unmount();
    // Each dealt with, and a margin to spare: nothing left on the desk, and no yardstick said.
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_vatelec.1_cgtalign.1`);
    position = part(/^Where that leaves you/);
    expect(within(position).queryByText('Still on your desk:')).toBeNull();
    expect(within(position).queryByText(/call headroom under/)).toBeNull();
  });

  it('says the tax take in words when it rises by more than half a point (Phase 25)', () => {
    const levy = at(`/review?${BASE}&${G}&L=moj.10_hscl.1`);
    const line = document.querySelector('.review__taxtake');
    expect(line?.textContent).toMatch(
      /^Taxes take \d+p more in every £100 of national income in 2029-30\. Worked out The OBR already forecasts the tax take at a historic high\./,
    );
    levy.unmount();
    // A small rise says nothing: the markets' band starts at half a point.
    at(`/review?${BASE}&${G}&L=moj.10_ipt.2`);
    expect(document.querySelector('.review__taxtake')).toBeNull();
  });

  it('says so when no tax or other budget moved, and names a missed rule and a broken promise', () => {
    const quiet = at(`/review?${BASE}&${G}&L=moj.10`);
    expect(within(part(/^Tax/)).getByText('No tax changed.')).toBeInTheDocument();
    expect(within(part(/^Spending/)).getByText('No other budget changed.')).toBeInTheDocument();
    expect(within(part(/^Where that leaves you/)).queryByText(/manifesto/)).toBeNull();
    quiet.unmount();
    at(`/review?${BASE}&${G}&L=dhsc.10_itbr.1`);
    const position = part(/^Where that leaves you/);
    // By its plain name and the engine's own margin (Phase 25).
    expect(
      within(position).getByText(
        /^Missed on today’s estimate: the day-to-day rule by £10\.4bn and the debt rule by £6\.3bn\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(position).getByText('Breaks the manifesto: The tax lock')).toHaveClass(
      'tag--warn',
    );
  });

  it('adds up: the headroom it ends on is the bar, to the pound', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_hscl.1_dfe.5`);
    const bar = screen.getByRole('region', { name: 'Your Budget so far' });
    const figure = bar.querySelector('.bar__figure')?.textContent;
    const line = within(part(/^Where that leaves you/)).getByText(/^Headroom goes from/);
    expect(line.textContent).toContain(`to ${figure} in 2029-30`);
  });

  it('prices every flagship with its sign: savings save, and one price throughout', () => {
    // The welfare bill (Phase 25, R4): the two savings read as savings, never as red costs.
    at(`/review?${BASE}&g=st.4_pr.welfare-bill&M=rate.0.75_rpi.0.5&L=rvpip.1_csjmh.1`);
    const flagships = part(/^Flagship policies/);
    const saves = within(flagships).getAllByText(/^saves £\d+\.\dbn$/);
    expect(saves).toHaveLength(2);
    for (const s of saves) expect(s).toHaveClass('amount--better');
    expect(within(flagships).queryByText(/costs/)).toBeNull();
  });

  it('shows a cut to a priority’s own budget as against it, and warns in amber when nothing delivers it', () => {
    // The adviser's usual health move on step 4 (−1%) with the NHS ranked: not a trimmed uplift.
    at(`/review?${BASE}&g=st.4_pr.nhs&M=rate.0.75_rpi.0.5&L=dhsc.-1`);
    const flagships = part(/^Flagship policies/);
    expect(
      within(flagships).getByText(/^Cuts against this priority: Health and social care · /),
    ).toHaveClass('review__against');
    expect(within(flagships).queryByText(/settled lower/)).toBeNull();
    expect(
      within(flagships).getByText(
        /^It is an agreed priority\. Nothing in your Budget delivers it yet\./,
      ),
    ).toHaveClass('review__short');
    // The cut is a cut: in the spending list too, as a saving.
    expect(
      within(part(/^Spending/)).getByText(/^Health and social care · 1% less/),
    ).toBeInTheDocument();
    expect(within(part(/^Spending/)).getByText(/^saves £\d\.\dbn$/)).toBeInTheDocument();
  });

  it('says when a priority is only started', () => {
    at(`/review?${BASE}&g=st.4_pr.nhs&M=rate.0.75_rpi.0.5&L=mhclg.5`);
    expect(
      within(part(/^Flagship policies/)).getByText(
        /^It is started, not delivered: nothing delivers it in full yet\./,
      ),
    ).toHaveClass('review__short');
  });

  it('delivers: the red button marks the game finished and opens Budget day with the Budget intact', async () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );
    const deliver = screen.getByRole('link', { name: 'Deliver my Budget' });
    expect(deliver.className).toMatch(/btn--budget/);
    fireEvent.click(deliver);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('g')).toMatch(/st\.5/);
      expect(params.get('L')).toMatch(/moj\.10/);
    });
  });
});
