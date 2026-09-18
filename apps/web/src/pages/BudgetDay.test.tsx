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
const region = (name: string) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;

function seedFor(id: string): number {
  for (let s = SEED_MIN; s <= SEED_MAX; s += 1)
    if (pickOutcome(s, draws.outcomes).id === id) return s;
  throw new Error(`no seed lands on ${id}`);
}
const ADVISER = seedFor('adviser-right');
const GAME = `g=s.${ADVISER}_st.5_pl.adviser_hr.20_th.security_pr.prisons+dip-gap_rv.1_rb.keep&M=rate.0.75_rpi.0.5`;

describe('Budget day: the speech, the afternoon, the morning after, the close', () => {
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

  it('then the room reacts: rules strip, three audiences and five households', () => {
    at(BASE);
    next();
    expect(screen.getByRole('heading', { name: /Your own rules/ })).toBeInTheDocument();
    for (const title of ['Parliament', 'The markets', 'The electorate']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    expect(
      screen.getByText(/You meet the rule with roughly the room your predecessor had/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/A family on universal credit/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('untouched').length).toBe(5);
  });

  it('prints the reading and the causes behind each band, so the judgement can be checked', () => {
    // A link carrying levers and no game opens every beat, so there is no Continue to press.
    at(`${BASE}&L=def5.1`);
    const markets = region('The markets');
    expect(within(markets).getByText(/Change in borrowing in the target year/)).toBeInTheDocument();
    expect(within(markets).getByText(/A large unfunded increase in borrowing/)).toBeInTheDocument();
    expect(within(markets).getAllByText(/Defence to 5% of GDP/).length).toBeGreaterThan(0);
    expect(screen.getByText(/You have missed your own stability rule/)).toBeInTheDocument();
  });

  it('gives Parliament its groups, and the electorate its households, once a game is under way', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    next();
    const parliament = region('Parliament');
    expect(within(parliament).getByText('MPs in marginal seats')).toBeInTheDocument();
    expect(
      within(parliament).getByText(/A promise made in Downing Street is broken/),
    ).toBeInTheDocument();
    expect(within(parliament).getByText(/The tax lock \(Basic rate\)/)).toBeInTheDocument();
    expect(within(parliament).getByText('No. 10')).toBeInTheDocument();
    expect(
      within(parliament).getByText(/One priority agreed in Downing Street is not funded/),
    ).toBeInTheDocument();
    const couple = screen.getByText(/A couple on median earnings/).closest('li') as HTMLElement;
    expect(within(couple).getByText(/A penny on the basic rate/)).toBeInTheDocument();
    expect(within(couple).getByText('worse off')).toBeInTheDocument();
  });

  it('reassesses the next morning, and names the delivery constraints on what was funded', () => {
    at(`${BASE}&${GAME}&L=moj.10_dip47.1`);
    next();
    next();
    expect(
      screen.getByText(/The morning papers have done the sums on frozen thresholds/),
    ).toBeInTheDocument();
    expect(screen.getByText(/£14bn of efficiencies are still pencilled in/)).toBeInTheDocument();
    expect(screen.getByText(/Money is not delivery/)).toBeInTheDocument();
    expect(screen.getByText(/Prison places take years to build/)).toBeInTheDocument();
  });

  it('keeps the workings behind the close, and reaching it marks the game finished', async () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    expect(screen.queryByText('The rules in full')).toBeNull();
    next();
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
    expect(within(speech).getByText(/a Justice uplift for prison capacity/)).toBeInTheDocument();
    expect(
      within(speech).getByText(/basic rate of income tax will be cut by one penny/),
    ).toBeInTheDocument();
  });
});
