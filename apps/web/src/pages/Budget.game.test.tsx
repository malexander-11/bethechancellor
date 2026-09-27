import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game at fine-tuning: two priorities ranked; every red line binds; on today's estimate. */
const GAME = 'g=st.3_pr.safer-streets+defence';

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
  it('keeps score in the summary strip: priorities and promises, with no target anywhere', () => {
    at(`/budget/spending?${BASE}&${GAME}`);
    const box = screen.getByRole('region', { name: 'Your Budget so far' });
    // Headroom is said once, on the scorecard, which keeps the estimate apart from the measures.
    expect(screen.queryByText(/your £\d+bn target|headroom target/)).toBeNull();
    expect(
      screen.getByText(/^OBR in March £23\.6bn · today’s estimate £6\.8bn · your measures/),
    ).toBeInTheDocument();
    expect(screen.getByText('Economic assumptions: today’s estimate.')).toBeInTheDocument();
    expect(within(box).queryByText(/Headroom/)).toBeNull();
    expect(within(box).getByText('0 of 2 delivered')).toBeInTheDocument();
    expect(within(box).getByText('all 6 kept')).toBeInTheDocument();
  });

  it('shows who pays and who benefits, interactions, and a published package for scale', () => {
    at(`/budget/spending?${BASE}&${GAME}&L=moj.10_dip47.1`);
    const who = screen.getByRole('region', { name: 'Who pays · who benefits' });
    expect(within(who).getByText('Courts and prisons')).toBeInTheDocument();
    expect(within(who).getByText(/receives £1\.4bn/)).toBeInTheDocument();
    expect(within(who).getByText('Defence')).toBeInTheDocument();
    // The running total is set against what a whole Budget's measures came to.
    const attribution = screen
      .getByRole('heading', { name: /What you’ve changed/ })
      .closest('section');
    expect(
      within(attribution as HTMLElement).getByText(/Budget 2025’s measures/),
    ).toBeInTheDocument();
    expect(within(attribution as HTMLElement).getByText(/20\.5bn better/)).toBeInTheDocument();
  });

  it('pins a chosen option’s lever to the top of its group, tagged with how it stands', () => {
    // Adjusted on the desk below what was chosen, the lever wears a red tag; on, the accent one.
    const first = at(`/budget/spending?${BASE}&${GAME}&L=moj.5`);
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    let panel = screen.getByRole('tabpanel');
    const adjusted = within(panel).getAllByText('Adjusted from what you chose');
    expect(adjusted).toHaveLength(1);
    // Which option, is in the tag's text, where a screen reader finds it.
    expect(adjusted[0]?.textContent).toMatch(/More money for prisons and courts/);
    // The pinned lever is the first control in the group, ahead of Health in the authored order.
    expect(within(panel).getAllByRole('slider')[0]).toHaveAccessibleName('Justice');
    first.unmount();
    at(`/budget/spending?${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByText('In your flagship policies')).toHaveLength(1);
    expect(within(panel).queryByText('Adjusted from what you chose')).toBeNull();
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

  it('marks the levy amber on the desk: the tax lock strained, not broken', () => {
    at(`/budget/taxes?${BASE}&L=hscl.1`);
    fireEvent.click(screen.getByRole('tab', { name: /National Insurance/ }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Strains the manifesto: The tax lock')).toHaveClass(
      'tag--amber',
    );
    expect(within(panel).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
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
    expect(within(panel).getAllByText('Game judgement').length).toBeGreaterThan(0);
    // Untouched, the Justice Secretary is still asking.
    expect(within(panel).getByText(/Every sentence served needs a cell/)).toBeInTheDocument();
  });

  it('has advisers who remember what was agreed in Downing Street', () => {
    at(`/budget/taxes?${BASE}&${GAME}&L=itbr.1`);
    const notes = screen.getByRole('region', { name: 'Your advisers' });
    expect(within(notes).getByText(/That is The tax lock, Chancellor/)).toBeInTheDocument();
    expect(
      within(notes).getByText(/Safer streets: prisons, police, borders is a priority you agreed/),
    ).toBeInTheDocument();
    // The Political Adviser's warning outranks the Director's reminder.
    const texts = within(notes)
      .getAllByText(/Chancellor|is a priority you agreed/)
      .map((e) => e.textContent);
    expect(texts[0]).toMatch(/tax lock/);
  });

  it('is a side room with a game under way: one beat, the briefing folded, one way back', () => {
    // The desk is one link away from the guided screens and never the default (ADR-0022).
    const spending = at(`/budget/spending?${BASE}&${GAME}`);
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByText(/Fine-tune tax and spend · Every lever/)).toBeInTheDocument();
    expect(screen.getByText('The Director of Public Spending’s briefing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to fine-tuning spending' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );
    expect(screen.queryByRole('link', { name: /Next: the/ })).toBeNull();
    // The way out to the forecast lives on the fine-tuning screens now.
    expect(screen.queryByRole('link', { name: /the OBR’s forecast/ })).toBeNull();
    spending.unmount();
    const taxes = at(`/budget/taxes?${BASE}&${GAME}`);
    expect(screen.getByRole('link', { name: 'Back to fine-tuning tax' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    // A game's desk keeps the game: no ready-made Budgets, which would replace the estimate, and
    // "Put every lever back" rather than a reset that would end the game.
    expect(screen.queryByText('Try a ready-made Budget')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset to OBR' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Put every lever back' })).toBeInTheDocument();
    taxes.unmount();
    // At the review, the way back is still to the fine-tuning screen these levers belong to.
    at(`/budget/taxes?${BASE}&g=st.4_pr.defence`);
    expect(screen.getByRole('link', { name: 'Back to fine-tuning tax' })).toBeInTheDocument();
  });

  it('puts every lever back without ending the game or changing the economy', async () => {
    at(`/budget/taxes?${BASE}&${GAME}&M=rate.0.75_rpi.0.5&L=itbr.1_moj.10`);
    fireEvent.click(screen.getByRole('button', { name: 'Put every lever back' }));
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('L')).toBeNull();
      expect(params.get('M')).toBe('rate.0.75_rpi.0.5');
      expect(params.get('g')).toBe('st.3_pr.safer-streets+defence');
    });
  });

  it('shows none of this on a sandbox Budget with no game', () => {
    at(`/budget/spending?${BASE}&L=dfe.-2`);
    expect(screen.queryByRole('region', { name: 'Your Budget so far' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Your advisers' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: /press summary/ })).toBeNull();
    // The ministers stay: they belong to the package, not to the game.
    fireEvent.click(screen.getByRole('tab', { name: /Day-to-day departmental budgets/ }));
    expect(screen.getAllByText('Education Secretary').length).toBeGreaterThan(0);
  });
});
