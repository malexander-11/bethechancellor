import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { deskLevers, finetuneItems, policyCount, shortlistPolicy } from '@btc/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { context, finetune } from '../data';
import {
  BASE,
  GAME,
  at,
  decision,
  group,
  levelsOf,
  namedRow,
  openDecision,
  priceOf,
  rowNames,
  scale,
  search,
  tickRow,
} from '../test/finetune';

const modeLine = () => document.querySelector('.mode-line');
/**
 * What basic mode shows on the spending screen on arrival, with nothing chosen: each pick under its
 * policy's title, and each lever already on the desk under its usual one, in the screen's order.
 */
const DESK = deskLevers(context);
const BASIC_ROWS = finetuneItems(finetune, 'spending').flatMap((item) => {
  const policy = shortlistPolicy(item) ?? (DESK.has(item.code) ? item.policies[0] : undefined);
  return policy ? [policy.title] : [];
});
const decisionsOn = (side: 'tax' | 'spending') => finetune[side].groups.flatMap((g) => g.decisions);

describe('fine-tune in basic mode: the advisers’ best ideas (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('shows every tax on the tax screen, which has no shortlist and no mode line (ADR-0039)', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    expect(modeLine()).toBeNull();
    expect(screen.queryByRole('button', { name: /every idea|best ideas/ })).toBeNull();
    // Advanced mode's screen: every decision, all closed, and its lead.
    expect(
      [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
    ).toEqual(decisionsOn('tax').map(() => 'false'));
    expect(screen.getByText(new RegExp(`^${finetune.tax.lead}`))).toBeInTheDocument();
  });

  it('shows the Director of Public Spending’s picks and what is on the desk, one card a section', () => {
    at(`/finetune/spending?${BASE}&${GAME}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    expect(screen.getByText(finetune.spending.shortlistLead ?? '')).toBeInTheDocument();
    expect(modeLine()?.textContent).toMatch(/^A shortlist\./);
    expect(document.querySelector('.badge')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: `See every idea (all ${policyCount(finetune, 'spending')} spending policies)`,
      }),
    ).toBeInTheDocument();
    // Each a row under its policy's title, with no decision around it to name it.
    expect(rowNames()).toEqual(BASIC_ROWS);
    // Every section holds a pick, one card each; no decisions, no count at rest.
    expect([...document.querySelectorAll('section.tune h2')].map((h) => h.textContent)).toEqual(
      finetune.spending.groups.map((g) => g.label),
    );
    expect(document.querySelectorAll('section.tune .tune__card')).toHaveLength(
      finetune.spending.groups.length,
    );
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    // Still one primary button, and the rows still price themselves.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    const rents = 'Raise housing benefit to match local rents';
    expect(priceOf(tickRow(rents))).toMatch(/^would cost £\d\.\dbn$/);
    // Chosen, a budget says so as it does in advanced mode.
    fireEvent.click(screen.getByRole('checkbox', { name: rents }));
    expect(group(/^Benefits 1 chosen · costs £\d\.\dbn/)).toBeInTheDocument();
  });

  it('says in basic mode too what a pick would take out, with no radios and no decisions', () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=csjmh.1`);
    // Chosen before the screen opened, the mental health change is on show beside the pick.
    const chosen = 'Stop disability benefits for milder mental health conditions';
    expect(screen.getByRole('checkbox', { name: chosen })).toBeChecked();
    const pick = screen.getByRole('checkbox', { name: 'Go ahead with the 2025 cuts to PIP' });
    expect(pick).not.toHaveAttribute('aria-disabled');
    expect(pick).toHaveAccessibleDescription(
      new RegExp(
        `^Choosing this takes out “${chosen}”\\. would (save|cost) £\\d+\\.\\dbn instead$`,
      ),
    );
    // No set of radios: basic mode has no decisions to draw one in.
    expect(document.querySelector('.tune__choice')).toBeNull();
  });

  it('swaps to every idea and back with one button, which keeps the focus', () => {
    at(`/finetune/spending?${BASE}&${GAME}`);
    const button = screen.getByRole('button', { name: /^See every idea/ });
    button.focus();
    fireEvent.click(button);
    // The same button, still focused, now offering the shortlist back; the screen is advanced
    // mode's, exactly.
    expect(screen.getByRole('button', { name: 'Show only the best ideas' })).toBe(button);
    expect(document.activeElement).toBe(button);
    const line = modeLine() as HTMLElement;
    expect(within(line).getByRole('status')).toHaveTextContent('Every idea is on show.');
    expect(line.textContent).not.toMatch(/A shortlist/);
    // Advanced mode's screen: every section, its decisions all closed.
    expect(document.querySelectorAll('.tune__row')).toHaveLength(0);
    expect(
      [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
    ).toEqual(decisionsOn('spending').map(() => 'false'));
    expect(screen.getByText(new RegExp(`^${finetune.spending.lead}`))).toBeInTheDocument();
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('advanced');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /^See every idea/ })).toBe(button);
    expect(within(line).getByRole('status')).toHaveTextContent('Only the best ideas are on show.');
    expect(rowNames()).toHaveLength(BASIC_ROWS.length);
    expect(window.localStorage.getItem('btc.mode.v1')).toBe('basic');
  });

  it('never hides what was chosen: a policy picked in advanced mode stays on show in basic', () => {
    window.localStorage.setItem('btc.mode.v1', 'advanced');
    at(`/finetune/spending?${BASE}&${GAME}`);
    openDecision('Change the other budgets');
    fireEvent.click(within(scale('Transport, day to day')).getByRole('radio', { name: '5% more' }));
    // The way back to the shortlist is the screen's own button (the footer's switch is withdrawn
    // for now, ADR-0032).
    fireEvent.click(screen.getByRole('button', { name: 'Show only the best ideas' }));
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    // In basic mode, the way it was chosen, as a scale from the plan, under its policy's title.
    const transport = 'Spend more on transport, day to day';
    expect(rowNames()).toContain(transport);
    expect(within(scale(transport)).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(rowNames()).toHaveLength(BASIC_ROWS.length + 1);
    // And back: the decision holding it opens, as it would on a visit that found it chosen.
    fireEvent.click(screen.getByRole('button', { name: /^See every idea/ }));
    expect(decision('Change the other budgets')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change health, schools and defence')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('shows a lever a link chose, and keeps it on show after Undo until the next visit', async () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=dft.5`);
    const name = 'Spend more on transport, day to day';
    const transport = scale(name);
    expect(within(transport).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(group(/^Public services 1 chosen · costs/)).toBeInTheDocument();
    fireEvent.click(within(transport).getByRole('button', { name: `Undo for ${name}` }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/dft/));
    // Still on show: a row never vanishes from under the pointer.
    expect(scale(name)).toBe(transport);
    expect(group(/^Public services$/)).toBeInTheDocument();
  });

  it('shows the flagships’ rows and the defence plan’s gap, which the briefing puts on the desk', () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    expect(
      screen.getByText(
        'Your Director of Public Spending’s best ideas. A top-up costs what a trim saves.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'See every idea (all 46 spending policies)' }),
    ).toBeInTheDocument();
    // The prisons flagship holds its lever: its row shows in basic mode as in advanced.
    expect(namedRow('Prisons and courts').querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    // In the order of their decisions: the defence plan's gap after council homes, and the PIP
    // cuts beside the reset they contradict (ADR-0037).
    expect(rowNames()).toEqual([
      'Spend more on health and social care',
      'Spend more on schools and education',
      'Prisons and courts',
      'Spend more on public investment',
      'More council and social rent homes',
      'Fund the defence plan’s gap',
      'Raise housing benefit to match local rents',
      'Go ahead with the 2025 cuts to PIP',
      'Limit winter fuel payments to pensioners on pension credit',
    ]);
    // A pick is the one way on show, a scale from where the budget is planned to be; no decisions.
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    expect(levelsOf(scale('Spend more on health and social care'))).toEqual([
      'As planned',
      '1% more',
      '2% more',
      '5% more',
    ]);
    // The screen's notes stay: how long the settlements run, and whose budgets these are.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
  });
});
