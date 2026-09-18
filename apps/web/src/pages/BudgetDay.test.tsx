import { pickOutcome, SEED_MAX, SEED_MIN } from '@btc/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { draws } from '../data';

function at(search: string) {
  // The provider reads the budget out of the real location, so set it before rendering.
  window.history.replaceState(null, '', `/budget-day?${search}`);
  render(
    <MemoryRouter initialEntries={[`/budget-day?${search}`]}>
      <App />
    </MemoryRouter>,
  );
}

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const next = () => fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
const card = (name: string) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;
const meter = (name: string) => within(card(name)).getByRole('img');

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}
const ADVISER = seedFor('adviser-right');
const GAME = `g=s.${ADVISER}_st.5_pl.adviser_hr.20_th.security_pr.prisons+dip-gap_rv.1_rb.keep&M=rate.0.75_rpi.0.5`;

describe('Budget day: the speech, the reaction, the close', () => {
  it('opens with the speech, every sentence badged as a game judgement', () => {
    at(BASE);
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    expect(within(speech).getByText(/Madam Deputy Speaker/)).toBeInTheDocument();
    expect(within(speech).getByText(/I commend this Budget to the House/)).toBeInTheDocument();
    expect(within(speech).getByText(/nobody said these words/)).toBeInTheDocument();
    // The baseline meets the rules with the March forecast's own headroom, and the speech says so.
    expect(within(speech).getByText(/£23\.6bn of headroom/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The markets' })).toBeNull();
  });

  it('then the room reacts: the rules line, three rated audiences and five households', () => {
    at(BASE);
    next();
    expect(screen.getByText(/You meet both fiscal rules and the welfare cap/)).toBeInTheDocument();
    for (const title of ['Your backbenchers', 'The markets', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // An empty Budget: the benches and the public shrug; the markets take March's headroom well.
    expect(meter('Your backbenchers')).toHaveAccessibleName('3 of 5: Divided');
    expect(meter('The public')).toHaveAccessibleName('3 of 5: Shrugging');
    expect(meter('The markets')).toHaveAccessibleName('4 of 5: Reassured');
    expect(within(card('The markets')).getAllByText(/inside the twenty billion/).length).toBe(2);
    expect(screen.getAllByText(/A family on universal credit/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('untouched').length).toBe(5);
  });

  it('gives the reasons and the decisions behind them, and shows its workings on request', () => {
    // A link carrying levers and no game opens every beat, so there is no Continue to press.
    at(`${BASE}&L=def5.1`);
    const markets = card('The markets');
    expect(meter('The markets')).toHaveAccessibleName('1 of 5: Alarmed');
    expect(within(markets).getAllByText(/The stability rule is missed/).length).toBe(2);
    expect(within(markets).getAllByText(/Defence to 5% of GDP/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Missed on these numbers: Stability rule/)).toBeInTheDocument();
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
    next();
    expect(meter('The public')).toHaveAccessibleName('1 of 5: Furious');
    expect(
      within(card('The public')).getAllByText(/A manifesto promise has been broken/).length,
    ).toBe(2);
    expect(
      within(card('Your backbenchers')).getAllByText(/manifesto red line is crossed/).length,
    ).toBe(2);
    expect(
      within(card('Your backbenchers')).getAllByText(/Because of The tax lock \(Basic rate\)/)
        .length,
    ).toBeGreaterThan(0);
    const couple = screen.getByText(/A couple on median earnings/).closest('li') as HTMLElement;
    expect(within(couple).getByText(/A penny on the basic rate/)).toBeInTheDocument();
    expect(within(couple).getByText('worse off')).toBeInTheDocument();
  });

  it('approves of a theme carried through, and names what the money does not buy', () => {
    at(`${BASE}&${GAME}&L=moj.10_dip47.1`);
    next();
    expect(meter('The public')).toHaveAccessibleName('4 of 5: Approving');
    expect(
      within(card('The public')).getAllByText(/One of the Budget’s themes shows up/).length,
    ).toBe(2);
    expect(screen.getByText(/Prison places take years to build/)).toBeInTheDocument();
  });

  it('keeps the workings behind the close, and reaching it marks the game finished', async () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    expect(screen.queryByText('The rules in full')).toBeNull();
    next();
    next();
    expect(screen.getByText('Your measures')).toBeInTheDocument();
    expect(screen.getByText('The rules in full')).toBeInTheDocument();
    expect(screen.getByText('Five-year paths')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 200));
    expect(new URLSearchParams(window.location.search).get('g')).toMatch(/st\.6/);
  });

  it('closes with the verdict: the kind of Budget, the ambitions, who paid, and every other forecast', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1&S=moj.10_dip47.1_itbr.1`);
    next();
    next();
    const close = screen.getByRole('region', { name: /A Budget|Half a programme|small moves/ });
    expect(within(close).getByText(/Which ambitions survived/)).toBeInTheDocument();
    expect(within(close).getByText(/A Justice uplift for prison capacity/)).toBeInTheDocument();
    expect(within(close).getByText(/broken on the desk \(Basic rate\)/)).toBeInTheDocument();
    expect(within(close).getByText(/Everyone who earns or spends/)).toBeInTheDocument();
    expect(within(close).getByText(/Courts and prisons/)).toBeInTheDocument();
    // The DIP gap was in the snapshot and is not in the package: a compromise that mattered.
    expect(within(close).getByText(/Defence plan gap/)).toBeInTheDocument();
    expect(within(close).getAllByText(/rules met|missed/).length).toBeGreaterThanOrEqual(5);
    expect(within(close).getByText('what arrived')).toBeInTheDocument();
    expect(
      within(close).getByRole('link', { name: /Replay under the same conditions/ }),
    ).toHaveAttribute('href', expect.stringContaining(`g=s.${ADVISER}`));
  });

  it('the speech follows the choices: theme, funded flagship, broken promise and the rabbit', () => {
    at(`${BASE}&${GAME.replace('rb.keep', 'rb.penny-off')}&L=moj.10_itbr.-1`);
    const speech = screen.getByRole('article', { name: 'The Budget speech' });
    expect(
      within(speech).getByText(/first duty of any government is the security/),
    ).toBeInTheDocument();
    expect(
      within(speech).getByText(/A Justice uplift for prison capacity: £1\.4bn in 2029-30/),
    ).toBeInTheDocument();
    expect(
      within(speech).getByText(/basic rate of income tax will be cut by one penny/),
    ).toBeInTheDocument();
  });
});
