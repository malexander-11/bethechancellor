import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** Fine-tuning done: at the review. */
const G = 'g=st.1_rd.2';

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

describe('step 2: deliver the Budget', () => {
  it('sends a game that has not finished fine-tuning back to where it is', () => {
    at(`/review?${BASE}&g=st.0_rd.2`);
    expect(screen.getByRole('heading', { level: 1, name: 'Fine-tune tax' })).toBeInTheDocument();
  });

  it('reads the Budget back, part by part, each with a way to change it', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_nicer.2_dfe.5`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deliver your Budget' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    // Nothing of the retired steps (ADR-0045): no priorities, no flagships.
    expect(screen.queryByRole('region', { name: /^Your priorities/ })).toBeNull();
    expect(screen.queryByRole('region', { name: /^Flagship policies/ })).toBeNull();

    // Every tax moved, under its plain title, with what it raises.
    const tax = part(/^Tax/);
    expect(within(tax).getByText(/^Employer National Insurance/)).toBeInTheDocument();
    expect(within(tax).getByText(/raises £2\d\.\dbn/)).toBeInTheDocument();
    expect(changeIn(tax, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );

    // Every other budget moved, with where it now stands and its cost.
    const spending = part(/^Spending/);
    // A spending line in the card's words: its share against the plan (Phase 25).
    expect(within(spending).getByText(/^Schools and education · 5% more/)).toBeInTheDocument();
    expect(within(spending).getAllByText(/costs £\d\.\dbn/).length).toBeGreaterThan(0);
    expect(within(spending).getByText(/^Prisons and courts/)).toBeInTheDocument();
    expect(changeIn(spending, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );

    // Where that leaves you: from the estimate to the bar, and who pays most (Phase 25).
    const position = part(/^Where that leaves you/);
    expect(
      within(position).getByText(
        /^Headroom goes from £14\.5bn to £\d+\.\dbn in 2029-30\. Taxes raise £\d+\.\dbn; day-to-day spending adds £\d+\.\dbn net; less borrowing saves £\d\.\dbn in interest\./,
      ),
    ).toBeInTheDocument();
    expect(
      within(position).getByText(/^Who pays most: business, £\d+\.\dbn in 2029-30\.$/),
    ).toBeInTheDocument();
    expect(
      within(position).getByText('You meet both fiscal rules, but miss the welfare cap by £2.8bn.'),
    ).toBeInTheDocument();
    // Employer National Insurance keeps the tax lock's words and strains its spirit: the Prime
    // Minister says so, in place of the bare amber tag (Phase 25).
    expect(
      within(position).getByText(
        'The words of the tax lock still hold. Expect the benches to ask about the spirit.',
      ),
    ).toBeInTheDocument();
    expect(within(position).queryByText('Strains the manifesto: The tax lock')).toBeNull();
    expect(changeIn(position, 'Change')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    // Nothing of the retired steps is left: no speech, no forecast, no target.
    expect(screen.queryByRole('region', { name: /For the speech/ })).toBeNull();
    expect(screen.queryByText(/Since the forecast/)).toBeNull();
    expect(screen.queryByText(/target/)).toBeNull();
  });

  it('says when a tax that does nothing by the target year starts, never that it raises nothing', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_wealth.1`);
    const tax = part(/^Tax/);
    expect(
      within(tax).getByText(/^nothing until \d{4}-\d{2}, then raises £\d+\.\dbn$/),
    ).toBeInTheDocument();
    expect(within(tax).queryByText(/raises £0\.0bn/)).toBeNull();
  });

  it('says a thin margin is thin, and nothing of a desk the Budget left clear (Phase 25)', () => {
    // Health 5% above its plan leaves under ten billion.
    const thin = at(`/review?${BASE}&${G}&L=dhsc.5`);
    let position = part(/^Where that leaves you/);
    expect(
      within(position).getByText(/Your advisers call headroom under £10bn thin/),
    ).toBeInTheDocument();
    expect(within(position).queryByText('Still on your desk:')).toBeNull();
    thin.unmount();
    // A margin to spare: nothing on the desk, and no yardstick said.
    at(`/review?${BASE}&${G}&L=moj.10`);
    position = part(/^Where that leaves you/);
    expect(within(position).queryByText('Still on your desk:')).toBeNull();
    expect(within(position).queryByText(/call headroom under/)).toBeNull();
    expect(within(position).queryByText(/manifesto/)).toBeNull();
  });

  it('says the tax take in words when it rises by more than half a point (Phase 25)', () => {
    const employer = at(`/review?${BASE}&${G}&L=moj.10_nicer.2`);
    const line = document.querySelector('.review__taxtake');
    expect(line?.textContent).toMatch(
      /^Taxes take \d+p more in every £100 of national income in 2029-30\. The OBR already forecasts the tax take at a historic high\./,
    );
    employer.unmount();
    // A small rise says nothing: the markets' band starts at half a point.
    at(`/review?${BASE}&${G}&L=moj.10_ved.20`);
    expect(document.querySelector('.review__taxtake')).toBeNull();
  });

  it('says so when no tax or other budget moved, and names a missed rule and a broken promise', () => {
    const quiet = at(`/review?${BASE}&${G}`);
    expect(
      within(part(/^Tax/)).getByText('No tax changed from the Chancellor’s Budget.'),
    ).toBeInTheDocument();
    expect(
      within(part(/^Spending/)).getByText('No budget changed from the Chancellor’s Budget.'),
    ).toBeInTheDocument();
    expect(within(part(/^Where that leaves you/)).queryByText(/manifesto/)).toBeNull();
    quiet.unmount();
    at(`/review?${BASE}&${G}&L=dhsc.10_itbr.1`);
    const position = part(/^Where that leaves you/);
    // By its plain name and the engine's own margin (Phase 25).
    expect(
      within(position).getByText(
        /^Missed on these numbers: the day-to-day rule by £\d+\.\dbn and the welfare cap by £\d\.\dbn\.$/,
      ),
    ).toBeInTheDocument();
    expect(within(position).getByText('Breaks the manifesto: The tax lock')).toHaveClass(
      'tag--warn',
    );
  });

  it('has the Prime Minister sign off, and reads out one reaction with no rating (Phase 25)', () => {
    // A penny on the basic rate the rules did not need: the Prime Minister asks why.
    const room = at(`/review?${BASE}&${G}&L=moj.10_dip47.1_itbr.1`);
    let position = part(/^Where that leaves you/);
    expect(within(position).getByText('The Prime Minister')).toBeInTheDocument();
    expect(
      within(position).getByText(
        'You’d break the tax lock with room to spare? Tell me what it buys that nothing else could.',
      ),
    ).toBeInTheDocument();
    // The line names the promise, so the red tag does not say it again.
    expect(within(position).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
    // One reaction already in train, in its own words, with no rating beside it.
    const reaction = position.querySelector('.review__reaction');
    expect(reaction?.textContent).toMatch(/Tax rises of £\d+\.\dbn a year/);
    expect(reaction?.textContent).not.toMatch(/of 5/);
    room.unmount();
    // All well: nothing from the Prime Minister, and nothing read out.
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1`);
    position = part(/^Where that leaves you/);
    expect(within(position).queryByText('The Prime Minister')).toBeNull();
    expect(position.querySelector('.review__reaction')).toBeNull();
  });

  it('adds up: the headroom it ends on is the bar, to the pound', () => {
    at(`/review?${BASE}&${G}&L=moj.10_dip47.1_nicer.2_dfe.5`);
    const bar = screen.getByRole('region', { name: 'Your Budget so far' });
    const figure = bar.querySelector('.bar__figure')?.textContent;
    const line = within(part(/^Where that leaves you/)).getByText(/^Headroom goes from/);
    expect(line.textContent).toContain(`to ${figure} in 2029-30`);
  });

  it('reads a saving as a saving, never as a red cost', () => {
    // The welfare bill (Phase 25, R4): the two savings read as savings.
    at(`/review?${BASE}&${G}&L=rvpip.1_csjmh.1`);
    const spending = part(/^Spending/);
    const saves = within(spending).getAllByText(/^saves £\d+\.\dbn$/);
    expect(saves).toHaveLength(2);
    for (const s of saves) expect(s).toHaveClass('amount--better');
    expect(within(spending).queryByText(/costs/)).toBeNull();
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
      expect(params.get('g')).toBe('st.2_rd.2');
      expect(params.get('L')).toMatch(/moj\.10/);
    });
  });
});
