import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

function at(search: string) {
  // The provider reads the budget out of the real location, so set it before rendering.
  window.history.replaceState(null, '', `/budget-day?${search}`);
  return render(
    <MemoryRouter initialEntries={[`/budget-day?${search}`]}>
      <App />
    </MemoryRouter>,
  );
}

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const card = (name: string) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;
const meter = (name: string) => within(card(name)).getByRole('img');
/** Open one of the folds by its summary. */
const open = (summary: string) => fireEvent.click(screen.getByText(summary));

/** Two priorities agreed, delivered from the review, on today's estimate (Phase 24). */
const GAME = 'g=st.4_pr.defence+safer-streets&M=rate.0.75_rpi.0.5';
/**
 * A game delivered with nothing agreed and nothing changed. Budget day needs a game (Phase 26):
 * the sandbox that once opened it with none has gone.
 */
const EMPTY = 'g=st.4&M=rate.0.75_rpi.0.5';

describe('Budget day: what your Budget means', () => {
  it('is one screen: the rules line, three rated audiences, and the rest behind folds', () => {
    at(`${BASE}&${EMPTY}`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    // The rules by their plain names; the welfare cap only when it is missed (Phase 25).
    expect(screen.getByText('You meet both fiscal rules on these numbers.')).toBeInTheDocument();
    for (const title of ['Labour backbenchers', 'The markets', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // An empty Budget: the benches and the public shrug; the markets find today's £6.8bn thin,
    // and say the economy since March took it, not the player's measures (Phase 25).
    expect(meter('Labour backbenchers')).toHaveAccessibleName('3 of 5: Divided');
    expect(meter('The public')).toHaveAccessibleName('3 of 5: Shrugging');
    expect(meter('The markets')).toHaveAccessibleName('2 of 5: Nervous');
    expect(within(card('The markets')).getAllByText(/not your measures/).length).toBe(2);
    // The speech, the households and the documents wait behind their folds, closed.
    for (const fold of ['Read the speech', 'Who feels it: five households', 'Budget documents']) {
      expect(screen.getByText(fold).closest('details')).not.toHaveAttribute('open');
    }
    // No Budget in three sentences, and no close (ADR-0043); "change something" means the review.
    expect(screen.queryByText(/in three sentences/)).toBeNull();
    expect(screen.queryByText('How your Budget went')).toBeNull();
    expect(screen.queryByText('Priorities, promises and who paid')).toBeNull();
    expect(screen.getByRole('link', { name: 'Change something' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/review\?/),
    );
  });

  it('reads the speech one fold away, every sentence said to be a game judgement', () => {
    at(`${BASE}&${EMPTY}`);
    open('Read the speech');
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    expect(within(speech).getByText(/Madam Deputy Speaker/)).toBeInTheDocument();
    expect(within(speech).getByText(/I commend this Budget to the House/)).toBeInTheDocument();
    expect(within(speech).getByText(/nobody said these words/)).toBeInTheDocument();
    // An empty Budget meets the rules with today's estimate's headroom, and the speech says so.
    expect(within(speech).getByText(/£6\.8bn of headroom/)).toBeInTheDocument();
  });

  it('gives the reasons and the decisions behind them, and every rule on request', () => {
    // Health, schools and prisons all up a tenth: about £35bn a year against £6.8bn of headroom.
    at(`${BASE}&${EMPTY}&L=dhsc.10_dfe.10_moj.10`);
    const markets = card('The markets');
    expect(meter('The markets')).toHaveAccessibleName('1 of 5: Alarmed');
    expect(within(markets).getAllByText(/The day-to-day rule is missed/).length).toBe(2);
    expect(within(markets).getAllByText(/the health budget/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/^Missed on these numbers: the day-to-day rule by £\d+\.\dbn/),
    ).toBeInTheDocument();
    // Every rule, its points and its reading sit behind "Why this rating".
    fireEvent.click(within(markets).getByText(/^Why this rating/));
    expect(
      within(markets).getByText(/Headroom against the day-to-day rule: −£/),
    ).toBeInTheDocument();
    expect(within(markets).getAllByText(/Every audience starts at three/).length).toBe(1);
  });

  it('pins the public at Furious when a manifesto red line is crossed', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    expect(meter('The public')).toHaveAccessibleName('1 of 5: Furious');
    expect(
      within(card('The public')).getAllByText(/A manifesto promise has been broken/).length,
    ).toBe(2);
    // On the surface each audience gives its strongest reason; the rest wait in "Why this rating".
    expect(
      within(card('Labour backbenchers')).getAllByText(/manifesto red line is crossed/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(card('Labour backbenchers')).getAllByText(
        /Because of the tax lock \(the basic rate of income tax\)/,
      ).length,
    ).toBeGreaterThan(0);
    // The one reason agrees with the rating; the other side is one short line (Phase 25).
    expect(within(card('The public')).getByText('Counted for: Priorities delivered')).toBeVisible();
    expect(
      within(card('The public')).getByText('Why this rating (1 for, 2 against)'),
    ).toBeInTheDocument();
    open('Who feels it: five households');
    const couple = screen.getByText(/A couple on median earnings/).closest('li') as HTMLElement;
    expect(within(couple).getByText(/A penny on the basic rate/)).toBeInTheDocument();
    expect(within(couple).getByText('worse off')).toBeInTheDocument();
  });

  it('marks employer National Insurance amber: the public is not pinned at the floor, and the strain is a reason', () => {
    at(`${BASE}&${GAME}&L=moj.10_nicer.1`);
    fireEvent.click(within(card('The public')).getByText(/^Why this rating/));
    // The floor is for the manifesto's own words: its rule reads that every red line holds. What
    // employer National Insurance costs with the public comes from its strain, named.
    expect(
      within(card('The public')).getAllByText(/Every manifesto red line holds/).length,
    ).toBeGreaterThan(0);
    expect(
      within(card('The public')).getAllByText(/kept in the words and tested in the spirit/).length,
    ).toBeGreaterThan(0);
    fireEvent.click(within(card('Labour backbenchers')).getByText(/^Why this rating/));
    expect(
      within(card('Labour backbenchers')).getAllByText(/keeps the letter of the manifesto/).length,
    ).toBeGreaterThan(0);
  });

  it('approves of a priority carried through, and says nothing of what the money buys (ADR-0043)', () => {
    at(`${BASE}&${GAME.replace('pr.defence+safer-streets', 'pr.safer-streets')}&L=moj.10`);
    expect(meter('The public')).toHaveAccessibleName('4 of 5: Approving');
    expect(
      within(card('The public')).getAllByText(/One of the Budget’s priorities is delivered in full/)
        .length,
    ).toBe(2);
    open('Who feels it: five households');
    expect(screen.getAllByText(/A family on universal credit/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/What the money does and does not buy/)).toBeNull();
    expect(screen.queryByText(/Prison places take years to build/)).toBeNull();
  });

  it('keeps the documents behind a fold, and arriving marks the game finished', async () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    open('Budget documents');
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    // The economy is named for what it is: our estimate, standing in for the OBR's own.
    expect(screen.getByText('Economic assumptions: today’s estimate.')).toBeInTheDocument();
    expect(screen.getByText(/this game uses today’s estimate in its place/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'the one you opened' })).toBeNull();
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('g')).toMatch(/st\.5/),
    );
  });

  it('the speech follows the choices: the first priority delivered, its options and its cuts', () => {
    at(`${BASE}&${GAME}&L=moj.10_alc.-5`);
    open('Read the speech');
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    // Defence is ranked first and left unfunded: the speech opens on what it did fund (Phase 25).
    expect(
      within(speech).getByText(/first duty of any government is the safety of its people/),
    ).toBeInTheDocument();
    expect(within(speech).queryByText(/security of its people/)).toBeNull();
    // It owns the forecast before it spends a penny, in figures the engine worked out.
    expect(
      within(speech).getByText(
        /^On today’s estimate, before any measure in this Budget, we borrow £\d+\.\dbn in 2026-27/,
      ),
    ).toBeInTheDocument();
    // The one price (Phase 25): what the flagship does to the headroom, interest included, so
    // a little more than the lever's own £1.4bn.
    expect(
      within(speech).getByText(/more money for prisons and courts, costing £1\.[5-9]bn in 2029-30/),
    ).toBeInTheDocument();
    expect(
      within(speech).getByText(/we cut taxes where we can: alcohol duties/),
    ).toBeInTheDocument();
    // On today's estimate, not the OBR's confirmation; and the Opposition has its say.
    expect(
      within(speech).getByText(/^On today’s estimate, this Budget meets the fiscal rules/),
    ).toBeInTheDocument();
    const reply = within(speech).getByRole('region', {
      name: /The Leader of the Opposition replies/,
    });
    // A judgement, as the strip above it says, with no badge of its own (ADR-0034).
    expect(reply.querySelector('.badge')).toBeNull();
    expect(reply.textContent).not.toMatch(/£/);
  });

  it('offers the ways on: a link to copy, the review to change something, and a fresh start', () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    expect(screen.getByRole('button', { name: 'Copy a link to this Budget' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change something' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/review\?/),
    );
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });

  it('weighs growth, debt interest and money that arrives late, in the markets’ fold (Phase 25)', () => {
    // Corporation tax up and CGT at death: the biggest measure with a note on growth speaks.
    at(`${BASE}&${GAME}&L=dip47.1_moj.10_ct.1_cgtdth.1`);
    const markets = card('The markets');
    const why = within(markets).getByText(/^Why this rating/);
    fireEvent.click(why);
    expect(within(markets).getByText('Growth and debt interest')).toBeInTheDocument();
    expect(
      within(markets).getByText(/leaves out effects on investment and the wider economy/),
    ).toBeInTheDocument();
    // CGT at death raises nothing before 2028-29: much of the new tax money comes late.
    expect(
      within(markets).getByText(
        /^\d+% of the new tax money in 2029-30 waits until 2028-29 or later\. The markets will want to see it arrive\.$/,
      ),
    ).toBeInTheDocument();
  });

  it('says what extra borrowing costs in interest, worked out, when borrowing rises (Phase 25)', () => {
    at(`${BASE}&${GAME}&L=dip47.1_moj.10_dhsc.3`);
    const markets = card('The markets');
    fireEvent.click(within(markets).getByText(/^Why this rating/));
    expect(
      within(markets).getByText(
        /^Extra borrowing adds about £\d+\.\dbn a year to debt interest by 2029-30\.$/,
      ),
    ).toBeInTheDocument();
  });

  it('never calls a household untouched when something in its groups moved (Phase 25)', () => {
    at(`${BASE}&${GAME}&L=dip47.1_moj.10_wealth2.1`);
    open('Who feels it: five households');
    const professional = screen
      .getByText('A higher-rate professional with savings')
      .closest('.household') as HTMLElement;
    expect(within(professional).getByText('nothing by name')).toBeInTheDocument();
    expect(
      within(professional).getByText('“Nothing aimed at us by name that we could see.”'),
    ).toBeInTheDocument();
  });
});
