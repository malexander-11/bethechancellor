import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const search = () => new URLSearchParams(window.location.search);
const part = (name: string) => screen.getByRole('region', { name });
const headings = () =>
  [...document.querySelectorAll('main section > h2')].map((h) => h.textContent?.trim());
/** Each row of the calculation: its label and its figure (no badge since ADR-0034). */
const rows = () =>
  [...document.querySelectorAll('.calc__row')].map((row) => [
    row.querySelector('dt')?.textContent,
    row.querySelector('.calc__figure')?.textContent,
  ]);
/** "£6.8bn" and "−£11.3bn" as numbers of billions, signed. */
const bn = (text: string | null | undefined) =>
  Number((text ?? '').replace('−', '-').replace(/[£bn]/g, ''));
const THREE = ['Your headroom', 'What is headroom?', 'How the headroom is calculated'];
/** The briefing's three parts, without the footer that shares the main column. */
const briefing = () => [...document.querySelectorAll<HTMLElement>('main section.brief')];

describe('the briefing, in three parts (Phase 28, ADR-0030; plain copy, ADR-0031)', () => {
  it('is where the old assumptions link now lands', () => {
    at(`/assumptions?${BASE}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeInTheDocument();
  });

  it('reads in the three parts the player asked for, and nothing after them', () => {
    at(`/outlook?${BASE}`);
    expect(headings()).toEqual(THREE);
    expect(screen.queryByText(/The Treasury’s briefing/)).toBeNull();
    // The desk, the folds on March and on forecasts, the rules in full and the line that switched
    // the briefing's mode all went (ADR-0031).
    for (const gone of [
      /Already on your desk/,
      /What changed since March/,
      /Why forecasts move/,
      /About the fiscal rules/,
      /full briefing|short briefing/,
    ]) {
      expect(screen.queryByText(gone), String(gone)).toBeNull();
    }
    expect(document.querySelector('.mode-line')).toBeNull();
  });

  it('gives your headroom: where you start, what Chancellors have kept and why, and what it would take', () => {
    at(`/outlook?${BASE}`);
    const first = part('Your headroom');
    const figure = within(first).getByText(/of breathing space in/);
    // Our estimate, not a published figure, and with no badge (ADR-0034).
    expect(figure).toHaveTextContent(/^You start with £6\.8bn of breathing space in 2029-30\.$/);
    expect(document.querySelector('main .badge')).toBeNull();
    expect(within(figure).getByText('£6.8bn').tagName).toBe('STRONG');
    // The OBR's own record, an official figure, then why Chancellors keep a margin: one paragraph.
    expect(within(first).getByText(/Chancellors have kept/)).toHaveTextContent(
      /^Since 2010, Chancellors have kept about £29bn on average\. This builds in some safety for adverse economic impact\.$/,
    );
    // What the record means for this Budget, softened in the player's words (2026-09-30):
    // "likely", and no figure. "Sensible" is the game's judgement.
    expect(within(first).getByText(/to build in a sensible buffer/)).toHaveTextContent(
      /^This means this Budget will likely need to increase the headroom to build in a sensible buffer\.$/,
    );
    expect(screen.queryByText(/will need to find around/)).toBeNull();
    // The household line and the source line went: the rows below say where the figure comes from.
    expect(screen.queryByText(/for each household/)).toBeNull();
    expect(screen.queryByText(/Our estimate: the March forecast/)).toBeNull();
  });

  it('says what headroom is in plain words: the rules, the word, what lenders must buy and why they care', () => {
    at(`/outlook?${BASE}`);
    const second = part('What is headroom?');
    expect(within(second).getByText(/pay for day-to-day spending with tax by/)).toHaveTextContent(
      /^Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then\.$/,
    );
    expect(within(second).getByText(/is how much you can spend, or cut in tax/)).toHaveTextContent(
      /^Headroom is how much you can spend, or cut in tax, and still meet the rules\.$/,
    );
    // No word on the briefing opens a definition (ADR-0031).
    for (const brief of briefing()) expect(brief.querySelector('.term')).toBeNull();
    // What the government must sell to lenders this year, and why they care: one paragraph, an
    // official figure and then words.
    const gilts = within(second).getByText(/plans to sell/);
    expect(gilts).toHaveTextContent(
      /^This year the government plans to sell £246bn of gilts, to fund its borrowing and repay old ones\. Lenders charge more when they doubt the sums\. Meeting the rules with headroom to spare keeps their trust\.$/,
    );
  });

  it('says the debt rule in the text, with the rule’s own year and the investment it counts', () => {
    at(`/outlook?${BASE}`);
    const second = part('What is headroom?');
    // In the running text straight after the rules, not a fold (2026-09-30): nothing to open.
    expect(second.querySelector('details')).toBeNull();
    const rules = within(second).getByText(/pay for day-to-day spending with tax by/);
    const debt = rules.nextElementSibling as HTMLElement;
    // In plain type, said to be the second of the two rules above it, then the player's words, with
    // the Charter's year: debt smaller in 2029-30 than the year before.
    expect(debt.querySelector('strong, b')).toBeNull();
    expect(debt).toHaveTextContent(
      /^The second rule is the debt rule\. Government debt must be a smaller share of the economy in 2029-30 than the year before\. Critically, this includes any borrowing for investment as well as day-to-day spending\.$/,
    );
  });

  it('shows how the headroom is calculated: what moved it, then the sums, adding up', () => {
    at(`/outlook?${BASE}`);
    const third = part('How the headroom is calculated');
    // What moved the forecast, in words, before the sums. The inflation row is interest on
    // index-linked gilts, so the line says debt, not spending.
    expect(within(third).getByText(/^Since March, interest rates and inflation/)).toHaveTextContent(
      /^Since March, interest rates and inflation have been higher than expected\. This means the government is paying more money to borrow, and paying more on debt linked to inflation\.$/,
    );
    expect(rows()).toEqual([
      ['The OBR’s March forecast', '£23.6bn'],
      ['Higher interest rates', '−£11.3bn'],
      ['Higher inflation', '−£5.5bn'],
      ['Today’s estimate', '£6.8bn'],
    ]);
    expect(third.querySelector('.badge')).toBeNull();
    // The rows add up as shown, and the last is the figure the briefing opens with.
    const shown = rows().map(([, figure]) => bn(figure));
    expect(shown[0]! + shown[1]! + shown[2]!).toBeCloseTo(shown[3]!, 9);
    expect(rows()[3]![1]).toBe(within(part('Your headroom')).getByRole('strong').textContent);
    const main = document.querySelector('main')?.textContent ?? '';
    // Every placeholder filled.
    expect(main).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(main).not.toMatch(/your target|headroom target|want to keep/i);
    // The £10bn advice gave way to the buffer line in part 1 (revised 2026-09-29).
    expect(main).not.toMatch(/aim to keep more than|markets get nervous/);
    expect(main).not.toMatch(/£20bn/);
    expect(main).not.toMatch(/That is why your headroom/);
  });

  it('reads as plain copy: no badge, no source, no word that opens a definition (ADR-0031)', () => {
    at(`/outlook?${BASE}`);
    expect(briefing()).toHaveLength(3);
    for (const brief of briefing()) {
      expect(brief.querySelector('.badge')).toBeNull();
      expect(brief.querySelector('.source, .briefing__sources')).toBeNull();
      expect(brief.querySelector('.term')).toBeNull();
      expect(brief.querySelector('a')).toBeNull();
    }
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('asks nothing: no forecasts to choose, no sliders, one primary action and a way back', () => {
    at(`/outlook?${BASE}`);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText(/October forecast|October’s forecast/)).toBeNull();
    expect(document.querySelectorAll('.btn--primary')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Set your priorities' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/(\?|$)/),
    );
  });

  it('starts the game on today’s estimate and goes to the priorities', async () => {
    at(`/outlook?${BASE}`);
    fireEvent.click(screen.getByRole('button', { name: 'Set your priorities' }));
    expect(await screen.findByText('What is this Budget for?')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.1');
      expect(search().get('M')).toBe('rate.0.75_rpi.0.5');
    });
  });

  it('keeps the game’s choices if the player comes back and sets off again', async () => {
    at(`/outlook?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5&L=moj.10`);
    // The briefing is the start of the road: a Budget already under way leaves it as it was.
    expect(rows()[3]![1]).toBe('£6.8bn');
    fireEvent.click(screen.getByRole('button', { name: 'Set your priorities' }));
    expect(await screen.findByText('What is this Budget for?')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.3_pr.defence');
      expect(search().get('L')).toBe('moj.10');
    });
  });
});

describe('the briefing in basic mode (Phase 27; the same in both modes since ADR-0031)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('is the briefing advanced mode shows, with nothing to switch', () => {
    const view = at(`/outlook?${BASE}`);
    const main = () => document.querySelector('main') as HTMLElement;
    expect(main().getAttribute('data-mode')).toBe('basic');
    expect(headings()).toEqual(THREE);
    expect(rows()).toHaveLength(4);
    expect(screen.getByText(/^The second rule is the debt rule\./)).toBeInTheDocument();
    expect(document.querySelector('.mode-line')).toBeNull();
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    const basic = main().textContent;
    view.unmount();
    window.localStorage.setItem('btc.mode.v1', 'advanced');
    at(`/outlook?${BASE}`);
    expect(main().getAttribute('data-mode')).toBe('advanced');
    expect(main().textContent).toBe(basic);
  });
});
