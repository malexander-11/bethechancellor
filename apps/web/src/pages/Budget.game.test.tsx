import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has been to Downing Street: security theme, two priorities; every red line binds. */
const GAME = 'g=s.7_st.2_pl.adviser_hr.20_th.security_pr.prisons+dip-gap';

function at(path: string) {
  window.history.replaceState(null, '', path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}

describe('the package, with a game under way', () => {
  it('keeps score in the summary strip: headroom against the target, priorities, promises', () => {
    at(`/budget/spending?${BASE}&${GAME}`);
    const box = screen.getByRole('status', { name: 'Your Budget so far' });
    expect(within(box).getByText(/against your £20bn target/)).toBeInTheDocument();
    expect(within(box).getByText('0 of 2 funded')).toBeInTheDocument();
    expect(within(box).getByText('all 6 kept')).toBeInTheDocument();
  });

  it('pins a promised flagship to the top of its group, tagged with how it stands', () => {
    // Un-funded in the package, the flagship wears a red tag; funded, the accent one.
    const first = at(`/budget/spending?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    let panel = screen.getByRole('tabpanel');
    const below = within(panel).getAllByText('Below what you promised the PM');
    expect(below).toHaveLength(1);
    expect(below[0]).toHaveAttribute(
      'title',
      expect.stringMatching(/A Justice uplift for prison capacity: you agreed \+10(\.0)?%/),
    );
    // The pinned lever is the first control in the group, ahead of Health in the authored order.
    expect(within(panel).getAllByRole('slider')[0]).toHaveAccessibleName('Justice');
    first.unmount();
    at(`/budget/spending?${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByText('Promised to the PM')).toHaveLength(1);
    expect(within(panel).queryByText('Below what you promised the PM')).toBeNull();
  });

  it('wears the manifesto red lines on the levers they watch, red once crossed', () => {
    at(`/budget/taxes?${BASE}&L=itbr.1`);
    fireEvent.click(screen.getByRole('tab', { name: /Income tax/ }));
    const panel = screen.getByRole('tabpanel');
    // The basic rate has been raised: the tax lock is broken, and the lever says so in red.
    expect(within(panel).getByText('Breaks the manifesto: The tax lock')).toBeInTheDocument();
    // The higher and additional rates are untouched: they wear the quiet tag, so the line is
    // learnt before it is crossed. The personal allowance is not in the lock and wears nothing.
    expect(within(panel).getAllByText('Manifesto: no rise').length).toBeGreaterThanOrEqual(2);
    const allowance = within(panel).getByRole('slider', { name: /Personal allowance/ });
    expect(allowance.closest('.lever')?.textContent).not.toMatch(/Manifesto/);
  });

  it('puts a minister on every spending lever, asking until the lever moves', () => {
    at(`/budget/spending?${BASE}&${GAME}&L=dfe.-2`);
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByText('Education Secretary').length).toBeGreaterThan(0);
    // Cut, the Education Secretary says what stops happening; the line is simulated and sourced.
    expect(
      within(panel).getByText(/nothing left to trim that is not a classroom/),
    ).toBeInTheDocument();
    expect(within(panel).getAllByText('Simulated').length).toBeGreaterThan(0);
    // Untouched, the Justice Secretary is still asking.
    expect(within(panel).getByText(/Every sentence served needs a cell/)).toBeInTheDocument();
  });

  it('has advisers who remember what was agreed in Downing Street', () => {
    at(`/budget/taxes?${BASE}&${GAME}&L=itbr.1`);
    const notes = screen.getByRole('region', { name: 'Your advisers' });
    expect(within(notes).getByText(/That is The tax lock, Chancellor/)).toBeInTheDocument();
    expect(
      within(notes).getByText(/A Justice uplift for prison capacity was funded when you left/),
    ).toBeInTheDocument();
    // The Political Adviser's warning outranks the Director's reminder.
    const texts = within(notes)
      .getAllByText(/Chancellor|was funded when you left/)
      .map((e) => e.textContent);
    expect(texts[0]).toMatch(/tax lock/);
  });

  it('plants the press summary the seed chose, badged simulated and with no masthead', () => {
    at(`/budget/spending?${BASE}&${GAME}`);
    const note = screen.getByRole('complementary', { name: /press summary/ });
    expect(within(note).getByText('Simulated')).toBeInTheDocument();
    expect(within(note).getByText(/Political Adviser · the morning papers/)).toBeInTheDocument();
    // Seed 7 draws a particular outcome; whichever it is, the headline is one of the five clues.
    expect(within(note).getByRole('strong').textContent?.length).toBeGreaterThan(10);
  });

  it('takes a snapshot of the package on the way out, and moves the game on', async () => {
    at(`/budget/policies?${BASE}&${GAME}&L=moj.10_ufsm.1`);
    fireEvent.click(screen.getByRole('link', { name: /the OBR’s forecast/ }));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('S')).toMatch(/moj\.10/);
      expect(params.get('S')).toMatch(/ufsm\.1/);
      expect(params.get('g')).toMatch(/st\.3/);
    });
  });

  it('shows none of this on a sandbox Budget with no game', () => {
    at(`/budget/spending?${BASE}&L=dfe.-2`);
    expect(screen.queryByRole('status', { name: 'Your Budget so far' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your advisers' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: /press summary/ })).toBeNull();
    // The ministers stay: they belong to the package, not to the game.
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    expect(screen.getAllByText('Education Secretary').length).toBeGreaterThan(0);
  });
});
