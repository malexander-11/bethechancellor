import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget } from '../data';
import { BALANCE_TEXT } from './Balance';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** The walk done: at the balance. */
const GAME = 'g=st.1_rd.3';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const h1 = (name: string) => screen.getByRole('heading', { level: 1, name });
const search = () => new URLSearchParams(window.location.search);
/** The menus' headings, in the order the page shows them. */
const menus = () =>
  screen
    .getAllByRole('region')
    .filter((r) => (r.getAttribute('aria-labelledby') ?? '').startsWith('menu-'))
    .map((r) => r.querySelector('h2')?.textContent);
const optionNamed = (label: string) =>
  screen.getByText(label, { selector: '.option__label' }).closest('li') as HTMLElement;
/** A button by its words and the option a screen reader hears after them. */
const named = (words: string, label: string) =>
  new RegExp(`^${words} ?: ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const add = (label: string) => screen.getByRole('button', { name: named(BALANCE_TEXT.add, label) });

describe('step 2: balance your Budget (ADR-0046)', () => {
  it('shows the ways to find money first when you are short, and waits until you have found it', async () => {
    // Disagreeing with the HMRC package gave its money up.
    at(`/balance?${BASE}&${GAME}&L=b6hmrc.1`);
    expect(h1('Balance your Budget')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(
      screen.getByText(
        /^You gave up £\d\.\dbn more than you saved\. Find it before you deliver\.$/,
      ),
    ).toBeInTheDocument();
    // Short, only the ways to find it: no priority can be afforded yet (ADR-0047).
    expect(menus()).toEqual([BALANCE_TEXT.raise]);
    const next = screen.getByRole('button', { name: BALANCE_TEXT.next });
    expect(next).toBeDisabled();
    expect(next).toHaveClass('btn--primary');
    expect(screen.getByText(/^Find £\d\.\dbn first\.$/)).toBeInTheDocument();
    // Half a point on employer National Insurance finds it, and more.
    fireEvent.click(add('Employer National Insurance up half a point'));
    await waitFor(() => expect(search().get('L')).toMatch(/nicer\.0\.5/));
    expect(screen.getByText(/^You have £\d\.\dbn to spend\./)).toBeInTheDocument();
    expect(menus()).toEqual([BALANCE_TEXT.spend, BALANCE_TEXT.raise]);
    fireEvent.click(screen.getByRole('link', { name: BALANCE_TEXT.next }));
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    await waitFor(() => expect(search().get('g')).toBe('st.2_rd.3'));
  });

  it('spends until the money runs out, and no further', async () => {
    // Disagreeing with the AI programme saves a little: not enough for 1% more for the NHS.
    at(`/balance?${BASE}&${GAME}&L=b6ai.1`);
    const nhs = 'More for the NHS and social care';
    expect(add(nhs)).toBeDisabled();
    expect(within(optionNamed(nhs)).getByText(/^£\d\.\dbn short$/)).toBeInTheDocument();
    // Find money, then spend it: twice is affordable, a third time is not.
    fireEvent.click(add('Employer National Insurance up half a point'));
    await waitFor(() => expect(add(nhs)).not.toBeDisabled());
    fireEvent.click(add(nhs));
    fireEvent.click(add(nhs));
    await waitFor(() => expect(search().get('L')).toMatch(/dhsc\.2/));
    expect(within(optionNamed(nhs)).getByText('Added twice')).toBeInTheDocument();
    expect(add(nhs)).toBeDisabled();
    // A press taken back.
    fireEvent.click(screen.getByRole('button', { name: named(BALANCE_TEXT.takeBack, nhs) }));
    await waitFor(() => expect(search().get('L')).toMatch(/dhsc\.1/));
    expect(within(optionNamed(nhs)).getByText('Added once')).toBeInTheDocument();
  });

  it('prices each option on the Budget as it stands, and tags a promise it strains', () => {
    at(`/balance?${BASE}&${GAME}`);
    expect(
      screen.getByText('Your Budget balances. You can find more money to spend more, or go on.'),
    ).toBeInTheDocument();
    const nics = optionNamed('Employer National Insurance up half a point');
    expect(nics.querySelector('.option__each')?.textContent).toMatch(
      /^Half a point each time · raises £\d+\.\dbn/,
    );
    expect(within(nics).getByText('Strains the tax lock')).toHaveClass('tag--amber');
    const meals = optionNamed('Free school meals for every child');
    expect(meals.querySelector('.option__each')?.textContent).toMatch(/^Once · costs £\d\.\dbn/);
    // Balanced, the way on is open.
    expect(screen.getByRole('link', { name: BALANCE_TEXT.next })).toBeInTheDocument();
  });

  it('switches a one-off on once, and lists what a link brought that is on no menu, to undo', async () => {
    at(`/balance?${BASE}&${GAME}&L=vats.1_ufsm.1`);
    expect(add('Free school meals for every child')).toBeDisabled();
    const others = screen.getByRole('region', { name: BALANCE_TEXT.others });
    expect(within(others).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(within(others).getByRole('button', { name: /^Undo/ }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/vats/));
    expect(screen.queryByRole('region', { name: BALANCE_TEXT.others })).toBeNull();
  });

  it('sends a game that has not finished the walk back to it', () => {
    at(`/balance?${BASE}&g=st.0_rd.3`);
    expect(h1(budget.themes[0]?.title ?? '')).toBeInTheDocument();
  });
});
