import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { finetune } from '../data';
import { INVESTMENT_NOTE } from '../components/LeverRow';
import {
  BASE,
  GAME,
  at,
  bar,
  decision,
  effectOf,
  group,
  h1,
  levelsOf,
  namedRow,
  openDecision,
  panelOf,
  priceOf,
  rowNames,
  rowOf,
  scale,
  search,
  statusOf,
  tickRow,
} from '../test/finetune';

describe('fine-tune spending: one card a decision (ADR-0037)', () => {
  it('lays the spending screen out by what the money is for, each section its decisions, all closed', () => {
    const { container } = at(`/finetune/spending?${BASE}&${GAME}`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Trim or top up any budget. A top-up costs what a trim saves. Your Director of Public Spending’s view shows once you choose.',
      ),
    ).toBeInTheDocument();
    // The sections in the data's order, as the money is for, with no count at rest (ADR-0037).
    const sections = screen
      .getAllByRole('region')
      .filter((r) => (r.getAttribute('aria-labelledby') ?? '').startsWith('tune-'));
    expect(sections.map((r) => r.querySelector('h2')?.textContent)).toEqual(
      finetune.spending.groups.map((g) => g.label),
    );
    // Every decision a heading's button, all closed: no row on arrival, and no fold.
    const toggles = [...container.querySelectorAll('.tune__decision-toggle')];
    expect(toggles).toHaveLength(finetune.spending.groups.flatMap((g) => g.decisions).length);
    for (const toggle of toggles) expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelectorAll('.tune__row')).toHaveLength(0);
    expect(screen.queryByText(/more polic(y|ies)$/)).toBeNull();
    expect(
      within(group(/^Public services$/))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Change health, schools and defence 3 choices',
      'Change the other budgets 6 choices',
      'Fund a new programme 3 choices',
    ]);
    expect(
      within(group(/^Benefits$/))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Change benefits for pensioners 3 choices',
      'Change working-age benefits 5 choices',
      'Change disability benefits 4 choices',
    ]);
    // The lead's hundred and twenty characters cannot say how long the deals run: a note does.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
    expect(screen.getByText(/falling 4\.4% a year after inflation/)).toBeInTheDocument();
    // Whose budgets most of these are: England's, and the other nations' share left out (Phase 25).
    expect(
      screen.getByText(/^Most public services here are England’s budgets\./),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.btn--primary')).toHaveLength(1);
  });

  it('draws a budget as one scale, with a minister once it moves and the flagships held', () => {
    const held = at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    // The prisons budget moved before the screen opened: its decision is open, and says so.
    expect(decision('Change the other budgets')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change health, schools and defence')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(statusOf('Change the other budgets')).toMatch(/^1 chosen · costs £\d\.\dbn$/);
    expect(group(/^Public services 1 chosen · costs £\d\.\dbn$/)).toBeInTheDocument();
    // It is where the flagship the player chose set it: a row naming the flagship, and the way
    // back to it; no scale that could quietly undo it (Phase 26).
    const prisons = namedRow('Prisons and courts');
    expect(prisons).toHaveClass('tune__row--held');
    expect(within(prisons).getByText('In your flagship policies')).toBeInTheDocument();
    expect(within(prisons).queryAllByRole('radio')).toHaveLength(0);
    expect(prisons.querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    expect(within(prisons).getByRole('link', { name: /Change/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    // The other budgets go by their short names in the card.
    expect(rowNames(panelOf('Change the other budgets'))).toEqual([
      'Home Office and borders',
      'Prisons and courts',
      'Grants to councils',
      'Transport, day to day',
      'Foreign Office and aid',
      'All other departments',
    ]);
    // A department's budget is one scale from 5% less to 5% more, the plan among them, under its
    // plain name; no Small, Medium or Large (ADR-0037).
    openDecision('Change health, schools and defence');
    const schools = scale('Schools and education');
    expect(levelsOf(schools)).toEqual([
      '5% less',
      '2% less',
      '1% less',
      'As planned',
      '1% more',
      '2% more',
      '5% more',
    ]);
    expect(within(schools).getByRole('radio', { name: 'As planned' })).toBeChecked();
    // At rest, how it grows after rising prices, then the nearest level each way in cash; no
    // minister and no adviser yet.
    expect(within(schools).queryByText('Education Secretary')).toBeNull();
    expect(priceOf(schools)).toMatch(
      /^Falls 0\.3% a year after rising prices, as planned1% less would save £\d\.\dbn · 1% more would cost £\d\.\dbn$/,
    );
    // Cut, its minister says what stops happening, and the new path sits beside the plan.
    fireEvent.click(within(schools).getByRole('radio', { name: '1% less' }));
    expect(within(schools).getByText('Education Secretary')).toBeInTheDocument();
    expect(effectOf(schools)).toMatch(
      /^Falls 0\.8% a year after rising prices \(planned: 0\.3%\) · £\d\.\dbn less than planned in 2029-30$/,
    );
    expect(statusOf('Change health, schools and defence')).toMatch(/^1 chosen · saves £\d\.\dbn$/);
    held.unmount();
    // Short of the flagship, a top-up is a scale: the flagship settled lower, and the Chief
    // Secretary says so (Phase 25); a cut is against it.
    const lower = at(`/finetune/spending?${BASE}&${GAME}&L=moj.5`);
    const topUp = scale('Prisons and courts');
    expect(within(topUp).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(topUp).getByText('In your flagship policies')).toBeInTheDocument();
    expect(
      within(topUp).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    lower.unmount();
    const against = at(`/finetune/spending?${BASE}&${GAME}&L=moj.-2`);
    const trim = scale('Prisons and courts');
    expect(within(trim).getByRole('radio', { name: '2% less' })).toBeChecked();
    expect(within(trim).getByText('Against your flagship policy')).toHaveClass('tag--warn');
    against.unmount();
    // Past its flagship's value, a top-up stays a scale that shows its own level; a setting no
    // level matches says what it is (Phase 26).
    const past = at(`/finetune/spending?${BASE}&g=st.3_pr.nhs&M=rate.0.75_rpi.0.5&L=dhsc.5`);
    const nhs = scale('Health and social care');
    expect(within(nhs).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(nhs).getByText('In your flagship policies')).toBeInTheDocument();
    past.unmount();
    at(`/finetune/spending?${BASE}&${GAME}&L=dhsc.3`);
    const stray = scale('Health and social care');
    expect(within(stray).getByText('Now 3% more')).toBeInTheDocument();
    for (const radio of within(stray).getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('says once which rule investment counts against, and prices it as borrowing', () => {
    at(`/finetune/spending?${BASE}&${GAME}`);
    const panel = openDecision('Change public investment');
    expect(within(panel).getAllByText(INVESTMENT_NOTE)).toHaveLength(1);
    expect(priceOf(tickRow('More council and social rent homes'))).toMatch(
      /^would add £\d+\.\dbn to borrowing$/,
    );
    expect(priceOf(scale('Public investment'))).toMatch(
      /5% less would take £\d+\.\dbn off borrowing · 5% more would add £\d+\.\dbn to borrowing$/,
    );
  });

  it('offers the way back to a flagship, not a swap, when the flagship holds the other of a pair', () => {
    // The 3% path, chosen for defence on step 3, holds its lever; the plan's gap counts some of the
    // same money, so step 4 cannot swap it in behind the flagship's back (Phase 26).
    at(`/finetune/spending?${BASE}&${GAME}&L=def3.1`);
    const gap = screen.getByRole('checkbox', { name: 'Fund the plan’s gap' });
    const row = rowOf(gap);
    expect(gap).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveClass('tune__row--blocked');
    expect(gap).toHaveAccessibleDescription(
      /^You can’t have both\. “Defence at 3% of GDP now, not in 2030-31” is in your flagship policies\./,
    );
    expect(within(row).queryByRole('button', { name: /Swap them/ })).toBeNull();
    expect(within(row).getByRole('link', { name: /Change it/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
    // Nothing to price: there is no swap.
    expect(priceOf(row)).toBe('');
    // The 3% path itself is a row naming its flagship, not a tick.
    const held = namedRow('3% of GDP now, not in 2030-31');
    expect(held).toHaveClass('tune__row--held');
    expect(held.textContent).toMatch(/In your flagship policies/);
    expect(within(held).queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('leads from the spending screen to the review, the package intact', async () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10_nicer.2`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Next: deliver the Budget' }));
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.4_pr.safer-streets+defence');
      expect(search().get('L')).toMatch(/nicer\.2/);
      expect(search().get('S')).toBeNull();
    });
  });

  it('sends the old and odd addresses to the right screen, and a link with no game to the briefing', () => {
    const old = at(`/budget/afford?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    old.unmount();
    const bare = at(`/finetune?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    bare.unmount();
    const odd = at(`/finetune/nothing?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    odd.unmount();
    // The desk's spending screen is step 4's now (Phase 26), and there is no link to a desk.
    const desk = at(`/budget/spending?${BASE}&${GAME}`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Every (tax|spending) lever/ })).toBeNull();
    desk.unmount();
    // With no game there is no sandbox: the briefing, and the link's measures wait for the game.
    const sandbox = at(`/finetune/spending?${BASE}&L=dfe.-2`);
    expect(h1('Your briefing')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'About this link' })).toHaveTextContent(
      'This link’s measures will be in your Budget when you start.',
    );
    sandbox.unmount();
    // A game that has not yet agreed its priorities is sent back to them.
    at(`/finetune/tax?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('lets one adviser speak above the cards, the most pressing, one at a time (Phase 25)', () => {
    // Nothing delivers defence yet: the Director of Public Spending says so.
    const quiet = at(`/finetune/tax?${BASE}&${GAME}&L=moj.10`);
    let advisers = screen.getByRole('region', { name: 'Your advisers' });
    expect(
      within(advisers).getByText(/^Defence on the NATO path is an agreed priority\./),
    ).toBeInTheDocument();
    quiet.unmount();
    // A penny on the basic rate breaks the tax lock, which comes first: one line, and no chorus.
    at(`/finetune/tax?${BASE}&${GAME}&L=moj.10_itbr.1`);
    advisers = screen.getByRole('region', { name: 'Your advisers' });
    expect(
      within(advisers).getByText(/^The tax lock is a manifesto red line, Chancellor\./),
    ).toBeInTheDocument();
    expect(within(advisers).queryByText(/agreed priority/)).toBeNull();
    expect(within(advisers).queryByText(/What the advisers say/)).toBeNull();
  });

  it('has the bar say what changed, once the choice settles (Phase 25)', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const status = within(bar()).getByRole('status');
    // Mounted empty: nothing is said on arrival, nor on opening a decision.
    expect(status).toBeEmptyDOMElement();
    openDecision('Change the rates');
    fireEvent.click(within(scale('Basic rate')).getByRole('radio', { name: '21%' }));
    // Nothing while arrow keys may still be moving along the scale; then only what changed, in the
    // bar's words.
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status.textContent).toMatch(/^Headroom, 2029-30: £\d+\.\dbn\./), {
      timeout: 3000,
    });
    expect(status.textContent).toMatch(/1 promise broken\.$/);
    expect(status.textContent).not.toMatch(/rules met/);
  });
});
