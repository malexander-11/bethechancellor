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

describe('Budget day: what your Budget means', () => {
  it('is one screen: the rules line, three rated audiences, and the rest behind folds', () => {
    at(BASE);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    // The rules by their plain names; the welfare cap only when it is missed (Phase 25).
    expect(screen.getByText('You meet both fiscal rules on these numbers.')).toBeInTheDocument();
    for (const title of ['Your backbenchers', 'The markets', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // An empty Budget: the benches and the public shrug; the markets take March's headroom well.
    expect(meter('Your backbenchers')).toHaveAccessibleName('3 of 5: Divided');
    expect(meter('The public')).toHaveAccessibleName('3 of 5: Shrugging');
    expect(meter('The markets')).toHaveAccessibleName('4 of 5: Reassured');
    expect(within(card('The markets')).getAllByText(/inside the twenty billion/).length).toBe(2);
    // The speech, the households and the documents wait behind their folds, closed.
    for (const fold of ['Read the speech', 'Who feels it: five households', 'Budget documents']) {
      expect(screen.getByText(fold).closest('details')).not.toHaveAttribute('open');
    }
    // No game: nothing to say in three sentences, and "change something" means the desk.
    expect(screen.queryByText(/Your Budget, in three sentences/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Change something' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/taxes/),
    );
  });

  it('reads the speech one fold away, every sentence badged as a game judgement', () => {
    at(BASE);
    open('Read the speech');
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    expect(within(speech).getByText(/Madam Deputy Speaker/)).toBeInTheDocument();
    expect(within(speech).getByText(/I commend this Budget to the House/)).toBeInTheDocument();
    expect(within(speech).getByText(/nobody said these words/)).toBeInTheDocument();
    // The baseline meets the rules with the March forecast's own headroom, and the speech says so.
    expect(within(speech).getByText(/£23\.6bn of headroom/)).toBeInTheDocument();
  });

  it('says the Budget in three sentences: what was prioritised, who pays, what was accepted', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    const statement = screen.getByRole('region', { name: /Your Budget, in three sentences/ });
    expect(
      within(statement).getByText('I prioritised defence and safer streets.'),
    ).toBeInTheDocument();
    expect(
      within(statement).getByText(/^I paid for it by asking everyone who earns or spends/),
    ).toBeInTheDocument();
    // A broken promise outranks a thin margin as the thing accepted.
    expect(within(statement).getByText('I accepted breaking the tax lock.')).toBeInTheDocument();
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
    // Health, schools and prisons all up a tenth: about £35bn a year against £23.6bn of headroom.
    at(`${BASE}&L=dhsc.10_dfe.10_moj.10`);
    const markets = card('The markets');
    expect(meter('The markets')).toHaveAccessibleName('1 of 5: Alarmed');
    expect(within(markets).getAllByText(/The stability rule is missed/).length).toBe(2);
    expect(within(markets).getAllByText(/Health and Social Care/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/^Missed on these numbers: the day-to-day rule by £\d+\.\dbn/),
    ).toBeInTheDocument();
    // Every rule, its points, its reading and its sources sit behind "Why this rating".
    fireEvent.click(within(markets).getByText('Why this rating'));
    expect(
      within(markets).getByText(/Headroom against the stability rule: −£/),
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
      within(card('Your backbenchers')).getAllByText(/Because of The tax lock \(Basic rate\)/)
        .length,
    ).toBeGreaterThan(0);
    open('Who feels it: five households');
    const couple = screen.getByText(/A couple on median earnings/).closest('li') as HTMLElement;
    expect(within(couple).getByText(/A penny on the basic rate/)).toBeInTheDocument();
    expect(within(couple).getByText('worse off')).toBeInTheDocument();
  });

  it('marks the levy amber: the public is not pinned at the floor, and the strain is a reason', () => {
    at(`${BASE}&${GAME}&L=moj.10_hscl.1`);
    fireEvent.click(within(card('The public')).getByText('Why this rating'));
    // The floor is for broken promises: its rule reads that every promise holds. What the levy
    // costs with the public comes from its size and its strain, both named (Phase 25 prices it at
    // about £26bn, 1.25 times the game's own National Insurance rows).
    expect(
      within(card('The public')).getAllByText(/Every manifesto promise on tax and welfare holds/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      within(card('The public')).getAllByText(/kept in the words and tested in the spirit/).length,
    ).toBeGreaterThan(0);
    fireEvent.click(within(card('Your backbenchers')).getByText('Why this rating'));
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

  it('the speech follows the choices: the first priority, its options and what it cuts', () => {
    at(`${BASE}&${GAME}&L=moj.10_alc.-5`);
    open('Read the speech');
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    expect(
      within(speech).getByText(/first duty of any government is the security/),
    ).toBeInTheDocument();
    // The one price (Phase 25): what the flagship does to the headroom, interest included, so
    // a little more than the lever's own £1.4bn.
    expect(
      within(speech).getByText(/more money for prisons and courts, £1\.[5-9]bn in 2029-30/),
    ).toBeInTheDocument();
    expect(
      within(speech).getByText(/we cut taxes where we can: alcohol duties/),
    ).toBeInTheDocument();
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
});
