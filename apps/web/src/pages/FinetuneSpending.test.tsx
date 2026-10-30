import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { budget, finetune } from '../data';
import { INVESTMENT_NOTE } from '../components/LeverRow';
import {
  BASE,
  GAME,
  adviceOf,
  at,
  bar,
  decision,
  effectOf,
  group,
  h1,
  levelsOf,
  openDecision,
  panelOf,
  priceOf,
  rowNames,
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
    // The lead is the data's own words, naming no adviser: each chosen row names its own.
    expect(screen.getByText(finetune.spending.lead)).toBeInTheDocument();
    expect(screen.queryByText(/view shows once you choose/)).toBeNull();
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
      'Change working-age benefits 6 choices',
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

  it('draws a budget as one scale, with a minister once it moves', () => {
    const chosen = at(`/finetune/spending?${BASE}&${GAME}&L=moj.5`);
    // The prisons budget moved before the screen opened: its decision is open, and says so.
    expect(decision('Change the other budgets')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change health, schools and defence')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(statusOf('Change the other budgets')).toMatch(/^1 chosen · costs £\d\.\dbn$/);
    expect(group(/^Public services 1 chosen · costs £\d\.\dbn$/)).toBeInTheDocument();
    // It is a scale like any other, at the level the link set it (ADR-0045): nothing holds it.
    const prisons = scale('Prisons and courts');
    expect(within(prisons).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(prisons).not.toHaveClass('tune__row--held');
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
    expect(adviceOf(schools)).toBe('');
    expect(priceOf(schools)).toMatch(
      /^Falls 0\.4% a year after rising prices, as planned1% less would save £\d\.\dbn · 1% more would cost £\d\.\dbn$/,
    );
    // Cut, its adviser speaks, named on the line, its minister says what stops happening, and the
    // new path sits beside the plan.
    fireEvent.click(within(schools).getByRole('radio', { name: '1% less' }));
    expect(adviceOf(schools)).toMatch(/^Director of Public Spending: \S/);
    expect(within(schools).getByText('Education Secretary')).toBeInTheDocument();
    expect(effectOf(schools)).toMatch(
      /^Falls 0\.9% a year after rising prices \(planned: 0\.4%\) · £\d\.\dbn less than planned in 2029-30$/,
    );
    expect(statusOf('Change health, schools and defence')).toMatch(/^1 chosen · saves £\d\.\dbn$/);
    chosen.unmount();
    // A setting no level matches says what it is (Phase 26).
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

  it('leads from the spending screen to the review, the package intact', async () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10_nicer.2`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Next: deliver the Budget' }));
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.1_rd.2');
      expect(search().get('L')).toMatch(/nicer\.2/);
      expect(search().get('S')).toBeNull();
    });
  });

  it('sends the old and odd addresses to the right screen, and a link with no game to the Budget', () => {
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
    // With no game there is no sandbox: the Chancellor's Budget, and the link's measures wait for
    // the game its button starts (ADR-0045).
    const sandbox = at(`/finetune/spending?${BASE}&L=dfe.-2`);
    expect(h1(budget.title)).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'About this link' })).toHaveTextContent(
      'This link’s measures will be in your Budget when you start.',
    );
    sandbox.unmount();
    // A six-stage link at its priorities opens fine-tuning, where the road starts now (ADR-0045).
    at(`/finetune/tax?${BASE}&g=st.1`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });

  it('shows every decision closed on both screens in a game that has chosen nothing', () => {
    for (const side of ['tax', 'spending'] as const) {
      const view = at(`/finetune/${side}?${BASE}&${GAME}`);
      expect(
        [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
          b.getAttribute('aria-expanded'),
        ),
        side,
      ).toEqual(finetune[side].groups.flatMap((g) => g.decisions).map(() => 'false'));
      view.unmount();
    }
  });

  it('says first what a spending choice would take out in its decision, and takes it out', async () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=csjmh.1`);
    const panel = panelOf('Change disability benefits');
    const pip = within(panel).getByRole('checkbox', { name: 'Go ahead with the 2025 PIP cuts' });
    expect(pip).toHaveAccessibleDescription(
      /^Choosing this takes out “Stop them for milder mental health conditions”\. would (save|cost) £\d+\.\dbn instead$/,
    );
    fireEvent.click(pip);
    await waitFor(() => expect(search().get('L')).toMatch(/rvpip\.1/));
    expect(search().get('L') ?? '').not.toMatch(/csjmh/);
  });

  it('has no adviser speak above the cards on either screen: the bar says what is short (ADR-0040)', () => {
    // A penny on the basic rate breaks the tax lock.
    for (const side of ['tax', 'spending']) {
      const view = at(`/finetune/${side}?${BASE}&${GAME}&L=moj.10_itbr.1`);
      expect(screen.queryByRole('region', { name: 'Your advisers' }), side).toBeNull();
      expect(bar().textContent, side).toMatch(/promise broken/);
      view.unmount();
    }
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
