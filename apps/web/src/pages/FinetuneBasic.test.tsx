import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { groupItems, policyCount, shortlistOf, shortlistPolicy } from '@btc/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { finetune } from '../data';
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

const modeLine = () => document.querySelector('.mode-line') as HTMLElement;
/** The Director of Tax's picks, in the order the screen shows them. */
const TAX_PICKS = shortlistOf(finetune, 'tax');

describe('fine-tune in basic mode: the advisers’ best ideas (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('shows the Director of Tax’s picks and nothing else, one card a tax', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    expect(
      screen.getByText('Your Director of Tax’s best ideas. Watch your headroom move.'),
    ).toBeInTheDocument();
    expect(modeLine().textContent).toMatch(/^A shortlist\./);
    expect(document.querySelector('.badge')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: `See every idea (all ${policyCount(finetune, 'tax')} tax policies)`,
      }),
    ).toBeInTheDocument();
    // Each pick a row under its policy's title, with no decision around it to name it.
    expect(rowNames()).toEqual(TAX_PICKS.map((p) => p.pick.title));
    // The taxes holding a pick, the rest left out, one card each; no decisions, no count at rest.
    const holding = finetune.tax.groups.filter((g) => groupItems(g).some(shortlistPolicy));
    expect([...document.querySelectorAll('section.tune h2')].map((h) => h.textContent)).toEqual(
      holding.map((g) => g.label),
    );
    expect(document.querySelectorAll('section.tune .tune__card')).toHaveLength(holding.length);
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    expect(screen.queryByText(/more polic(y|ies)$/)).toBeNull();
    // The one way on show, as a scale from where the tax is planned to be (ADR-0035).
    expect(levelsOf(scale('Put up employer National Insurance'))).toEqual([
      '15% as planned',
      '16%',
      '17%',
      '18%',
    ]);
    // Still one primary button, and the rows still price themselves.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    expect(priceOf(tickRow('Put gambling duties up again'))).toMatch(/^would raise £\d\.\dbn$/);
    // Chosen, a tax says so as it does in advanced mode.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Put gambling duties up again' }));
    expect(group(/^Duties 1 chosen · raises £\d\.\dbn/)).toBeInTheDocument();
  });

  it('says in basic mode too what a pick would take out, with no radios and no decisions', () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=cgtexit.1`);
    // Chosen before the screen opened, the charge on leavers is on show beside the pick.
    expect(
      screen.getByRole('checkbox', { name: 'Charge capital gains tax on people who leave the UK' }),
    ).toBeChecked();
    const pick = screen.getByRole('checkbox', { name: 'Tax capital gains when someone dies' });
    expect(pick).not.toHaveAttribute('aria-disabled');
    expect(pick).toHaveAccessibleDescription(
      /^Choosing this takes out “Charge capital gains tax on people who leave the UK”\. would (raise|cost) £\d+\.\dbn instead$/,
    );
    expect(screen.queryByRole('radio', { name: 'As planned' })).toBeNull();
  });

  it('swaps to every idea and back with one button, which keeps the focus', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const button = screen.getByRole('button', { name: /^See every idea/ });
    button.focus();
    fireEvent.click(button);
    // The same button, still focused, now offering the shortlist back; the screen is advanced
    // mode's, exactly.
    expect(screen.getByRole('button', { name: 'Show only the best ideas' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(within(modeLine()).getByRole('status')).toHaveTextContent('Every idea is on show.');
    expect(modeLine().textContent).not.toMatch(/A shortlist/);
    // Advanced mode's screen: every tax, its decisions all closed.
    expect(document.querySelectorAll('.tune__row')).toHaveLength(0);
    expect(
      [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
    ).toEqual(finetune.tax.groups.flatMap((g) => g.decisions).map(() => 'false'));
    expect(group(/^Wealth tax$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Raise or cut any tax. Watch your headroom move. Your Director of Tax’s view shows once you choose.',
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('advanced');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /^See every idea/ })).toBe(button);
    expect(within(modeLine()).getByRole('status')).toHaveTextContent(
      'Only the best ideas are on show.',
    );
    expect(rowNames()).toHaveLength(TAX_PICKS.length);
    expect(window.localStorage.getItem('btc.mode.v1')).toBe('basic');
  });

  it('never hides what was chosen: a policy picked in advanced mode stays on show in basic', () => {
    window.localStorage.setItem('btc.mode.v1', 'advanced');
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Tax drink, tobacco and gambling');
    fireEvent.click(within(scale('Alcohol')).getByRole('radio', { name: '5% more' }));
    // The way back to the shortlist is the screen's own button (the footer's switch is withdrawn
    // for now, ADR-0032).
    fireEvent.click(screen.getByRole('button', { name: 'Show only the best ideas' }));
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    // In basic mode, the way it was chosen, as a scale from the plan, under its policy's title.
    expect(rowNames()).toContain('Put up alcohol duty');
    expect(
      within(scale('Put up alcohol duty')).getByRole('radio', { name: '5% more' }),
    ).toBeChecked();
    expect(rowNames()).toHaveLength(TAX_PICKS.length + 1);
    // And back: the decision holding it opens, as it would on a visit that found it chosen.
    fireEvent.click(screen.getByRole('button', { name: /^See every idea/ }));
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a lever a link chose, and keeps it on show after Undo until the next visit', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=alc.5`);
    const alcohol = scale('Put up alcohol duty');
    expect(within(alcohol).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(group(/^Duties 1 chosen · raises/)).toBeInTheDocument();
    fireEvent.click(within(alcohol).getByRole('button', { name: 'Undo for Put up alcohol duty' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/alc/));
    // Still on show: a row never vanishes from under the pointer.
    expect(scale('Put up alcohol duty')).toBe(alcohol);
    expect(group(/^Duties$/)).toBeInTheDocument();
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
