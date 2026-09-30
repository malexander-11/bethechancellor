import { fireEvent, render, screen, within } from '@testing-library/react';
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
    for (const title of ['Your backbenchers', 'The markets', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // An empty Budget: the benches and the public shrug; the markets find today's £6.8bn thin,
    // and say the economy since March took it, not the player's measures (Phase 25).
    expect(meter('Your backbenchers')).toHaveAccessibleName('3 of 5: Divided');
    expect(meter('The public')).toHaveAccessibleName('3 of 5: Shrugging');
    expect(meter('The markets')).toHaveAccessibleName('2 of 5: Nervous');
    expect(within(card('The markets')).getAllByText(/not your measures/).length).toBe(2);
    // The speech, the households and the documents wait behind their folds, closed.
    for (const fold of ['Read the speech', 'Who feels it: five households', 'Budget documents']) {
      expect(screen.getByText(fold).closest('details')).not.toHaveAttribute('open');
    }
    // Nothing changed, and the three sentences say so; "change something" means the review.
    const statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    expect(within(statement).getByText('I changed no taxes and no spending.')).toBeInTheDocument();
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

  it('says the Budget in three sentences: what was prioritised, who pays, what was accepted', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    const statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    // Defence was agreed and left unfunded, and the first sentence says so (Phase 25).
    expect(
      within(statement).getByText(
        'I prioritised safer streets, and named defence a priority but put nothing behind it.',
      ),
    ).toBeInTheDocument();
    expect(
      within(statement).getByText(
        'I paid for it by asking everyone who earns or spends to pay more, and kept the rest as headroom.',
      ),
    ).toBeInTheDocument();
    // A broken promise outranks a thin margin as the thing accepted.
    expect(within(statement).getByText('I accepted breaking the tax lock.')).toBeInTheDocument();
  });

  it('says borrowing past the rules as borrowing, never as headroom', () => {
    at(`${BASE}&${GAME}&L=itbr.-2`);
    const statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    expect(
      within(statement).getByText(
        'I cut taxes for everyone who earns or spends, and paid for it by borrowing more than the rules allow.',
      ),
    ).toBeInTheDocument();
    expect(within(statement).getByText(/^I accepted missing the day-to-day rule by/)).toBeVisible();
    expect(within(statement).queryByText(/headroom I had/)).toBeNull();
  });

  it('says what was accepted when nothing was broken: a thin margin, or what was kept', () => {
    // Prisons paid for out of today's estimate: under ten billion is left, and the Budget says so.
    const thin = at(`${BASE}&${GAME}&L=moj.10`);
    let statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    expect(
      within(statement).getByText('I paid for it out of the headroom I had.'),
    ).toBeInTheDocument();
    expect(
      within(statement).getByText(/^I accepted a thin margin: £\d\.\dbn of headroom\.$/),
    ).toBeInTheDocument();
    thin.unmount();
    // Paid for by broadening the VAT base, which the tax lock does not name: every promise kept.
    at(`${BASE}&${GAME}&L=moj.10_vatfood.1`);
    statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    expect(
      within(statement).getByText(/^I kept every promise and £\d+\.\dbn of headroom\.$/),
    ).toBeInTheDocument();
  });

  it('gives the reasons and the decisions behind them, and shows its workings on request', () => {
    // Health, schools and prisons all up a tenth: about £35bn a year against £6.8bn of headroom.
    at(`${BASE}&${EMPTY}&L=dhsc.10_dfe.10_moj.10`);
    const markets = card('The markets');
    expect(meter('The markets')).toHaveAccessibleName('1 of 5: Alarmed');
    expect(within(markets).getAllByText(/The day-to-day rule is missed/).length).toBe(2);
    expect(within(markets).getAllByText(/the health budget/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/^Missed on these numbers: the day-to-day rule by £\d+\.\dbn/),
    ).toBeInTheDocument();
    // Every rule, its points, its reading and its sources sit behind "Why this rating".
    fireEvent.click(within(markets).getByText(/^Why this rating/));
    expect(
      within(markets).getByText(/Headroom against the day-to-day rule: −£/),
    ).toBeInTheDocument();
    expect(within(markets).getAllByText(/Every audience starts at three/).length).toBe(1);
    expect(within(markets).getAllByRole('link').length).toBeGreaterThan(0);
  });

  it('pins the public at Furious when a manifesto red line is crossed', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    expect(meter('The public')).toHaveAccessibleName('1 of 5: Furious');
    expect(
      within(card('The public')).getAllByText(/A manifesto promise has been broken/).length,
    ).toBe(2);
    // On the surface each audience gives its strongest reason; the rest wait in "Why this rating".
    expect(
      within(card('Your backbenchers')).getAllByText(/manifesto red line is crossed/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(card('Your backbenchers')).getAllByText(
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
    fireEvent.click(within(card('Your backbenchers')).getByText(/^Why this rating/));
    expect(
      within(card('Your backbenchers')).getAllByText(/keeps the letter of the manifesto/).length,
    ).toBeGreaterThan(0);
  });

  it('approves of a priority carried through, and names what the money does not buy', () => {
    at(`${BASE}&${GAME.replace('pr.defence+safer-streets', 'pr.safer-streets')}&L=moj.10`);
    expect(meter('The public')).toHaveAccessibleName('4 of 5: Approving');
    expect(
      within(card('The public')).getAllByText(/One of the Budget’s priorities is delivered in full/)
        .length,
    ).toBe(2);
    open('Who feels it: five households');
    expect(screen.getAllByText(/A family on universal credit/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prison places take years to build/)).toBeInTheDocument();
  });

  it('keeps the documents behind a fold, and arriving marks the game finished', async () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    open('Budget documents');
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    // The economy is named for what it is: our estimate, standing in for the OBR's own.
    expect(screen.getByText('Economic assumptions: today’s estimate.')).toBeInTheDocument();
    expect(screen.getByText(/this game uses today’s estimate in its place/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'the one you opened' })).toBeNull();
    // The tests run with the workings on, so the rules in full and the paths are there too.
    expect(screen.getByText('The rules in full')).toBeInTheDocument();
    expect(screen.getByText('Five-year paths')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 200));
    expect(new URLSearchParams(window.location.search).get('g')).toMatch(/st\.5/);
  });

  it('closes with the verdict: the kind of Budget, the ambitions and who paid', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    const close = screen.getByRole('region', { name: /A Budget|Half a programme|small moves/ });
    expect(within(close).getByText(/Which ambitions survived/)).toBeInTheDocument();
    expect(within(close).getByText(/Safer streets: prisons, police, borders/)).toBeInTheDocument();
    expect(within(close).getByText(/broken by choice \(Basic rate\)/)).toBeInTheDocument();
    expect(within(close).getByText(/Everyone who earns or spends/)).toBeInTheDocument();
    expect(within(close).getByText(/Courts and prisons/)).toBeInTheDocument();
    // Phase 24 retired the forecast that arrived later: no compromises since it, no other
    // forecasts to re-run the Budget under, no replay of a seed.
    expect(within(close).queryByText(/The compromises that mattered/)).toBeNull();
    expect(within(close).queryByText(/other forecasts/)).toBeNull();
    expect(within(close).queryByText('what arrived')).toBeNull();
    expect(screen.queryByRole('link', { name: /Replay/ })).toBeNull();
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

  it('names the trade-off it checked: a priority left out with money to spare', () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    const close = screen.getByRole('region', { name: /A priority left out with money to spare/ });
    expect(within(close).getByText('How your Budget went')).toBeInTheDocument();
    // The judgement, then the worked-out fact behind it, with no badges (ADR-0034).
    const fact = within(close).getByText(
      /^Delivering defence in full with “Fill the funding gap in the defence investment plan” would still meet both rules, with £\d+\.\dbn of headroom\.$/,
    );
    expect(fact).toHaveClass('verdict-close__fact');
    expect(close.querySelector('.badge')).toBeNull();
    expect(within(close).getByText('Priorities, promises and who paid')).toBeInTheDocument();
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
