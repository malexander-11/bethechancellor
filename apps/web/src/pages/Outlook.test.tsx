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
/** Each row of the calculation: its label, its figure and its badge. */
const rows = () =>
  [...document.querySelectorAll('.calc__row')].map((row) => [
    row.querySelector('dt')?.textContent,
    row.querySelector('.calc__figure')?.textContent,
    row.querySelector('.badge')?.textContent,
  ]);
/** "£6.8bn" and "−£11.3bn" as numbers of billions, signed. */
const bn = (text: string | null | undefined) =>
  Number((text ?? '').replace('−', '-').replace(/[£bn]/g, ''));

describe('the briefing, in three parts (Phase 28, ADR-0030)', () => {
  it('is where the old assumptions link now lands', () => {
    at(`/assumptions?${BASE}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeInTheDocument();
  });

  it('reads in the three parts the player asked for, then the desk', () => {
    at(`/outlook?${BASE}`);
    expect(headings()).toEqual([
      'Your headroom',
      'What is headroom?',
      'How the headroom is calculated',
      'Already on your desk',
    ]);
    expect(screen.queryByText(/The Treasury’s briefing/)).toBeNull();
  });

  it('gives your headroom: where you start, what Chancellors have kept and why, and what it would take', () => {
    at(`/outlook?${BASE}`);
    const first = part('Your headroom');
    const figure = within(first).getByText(/of breathing space in/);
    // Our estimate, not a published figure: it wears the Assumption badge and says so.
    expect(figure).toHaveTextContent(
      /^You start with £6\.8bn of breathing space in 2029-30\. Assumption$/,
    );
    expect(within(figure).getByText('£6.8bn').tagName).toBe('STRONG');
    // The OBR's own record, an official figure, then why Chancellors keep a margin, in words with
    // their sources: one paragraph, each part wearing its own badge.
    const history = within(first).getByText(/Chancellors have kept/);
    expect(history).toHaveTextContent(
      /^Official figure Since 2010, Chancellors have kept about £29bn on average\./,
    );
    expect(history).toHaveTextContent(
      /Commentary This builds in some safety for adverse economic impact\./,
    );
    expect(
      within(history).getAllByRole('link', {
        name: /OBR, Economic and fiscal outlook – November 2025/,
      }),
    ).toHaveLength(2);
    expect(history).toHaveTextContent(/around £29 billion/);
    expect(history).toHaveTextContent(/relatively vulnerable to future shocks/);
    expect(
      within(history).getByRole('link', { name: /HMT, Chancellor letter to the Treasury/ }),
    ).toBeInTheDocument();
    // What reaching that record would take: the record less the estimate, read from the two
    // figures above. "Sensible" is a judgement, so the line wears Game judgement.
    const buffer = within(first).getByText(/to build in a sensible buffer/);
    expect(buffer).toHaveTextContent(
      /^Game judgement This means this Budget will need to find around £22bn to build in a sensible buffer\./,
    );
    expect(buffer).toHaveTextContent(/£21 billion average absolute revision/);
    // The household line and the source line went: the rows below say where the figure comes from.
    expect(screen.queryByText(/for each household/)).toBeNull();
    expect(screen.queryByText(/Our estimate: the March forecast/)).toBeNull();
  });

  it('says what headroom is: the rules, the word, what lenders must buy this year and why they care', () => {
    at(`/outlook?${BASE}`);
    const second = part('What is headroom?');
    // The line carries a glossary term, so it is matched on a plain run and read whole.
    expect(within(second).getByText(/pay for day-to-day spending with tax by/)).toHaveTextContent(
      /^Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then\.$/,
    );
    expect(within(second).getByRole('button', { name: 'rules' })).toBeInTheDocument();
    // What headroom is, with the word a tap away: the page's one Headroom button.
    const meaning = within(second).getByText(/is how much you can spend, or cut in tax/);
    expect(meaning).toHaveTextContent(
      /^Headroom is how much you can spend, or cut in tax, and still meet the rules\.$/,
    );
    expect(within(meaning).getByRole('button', { name: 'Headroom' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Headroom' })).toHaveLength(1);
    // What the government must sell to lenders this year, and why they care: one paragraph, an
    // official figure and then words with their sources, each part wearing its own badge.
    const gilts = within(second).getByText(/plans to sell/);
    expect(gilts).toHaveTextContent(
      /^Official figure This year the government plans to sell £246bn of gilts, to fund its borrowing and repay old ones\./,
    );
    expect(within(gilts).getByRole('button', { name: 'gilts' })).toBeInTheDocument();
    expect(
      within(gilts).getByRole('link', { name: /HMT, Revision to the DMO Financing Remit 2026-27/ }),
    ).toBeInTheDocument();
    expect(gilts).toHaveTextContent(/gilt sales of £246\.2 billion/);
    expect(gilts).toHaveTextContent(
      /Commentary Lenders charge more when they doubt the sums\. Meeting the rules with headroom to spare keeps their trust\./,
    );
    expect(within(gilts).getByRole('link', { name: /BoE, Bank Insights/ })).toBeInTheDocument();
    expect(
      within(gilts).getByRole('link', { name: /HMT, Chancellor letter to the Treasury/ }),
    ).toBeInTheDocument();
    expect(within(second).getByText(/Lenders charge more/)).toBe(gilts);
  });

  it('shows how the headroom is calculated: what moved it, then the sums, adding up', () => {
    at(`/outlook?${BASE}`);
    const third = part('How the headroom is calculated');
    // What moved the forecast, in words, before the sums. The inflation row is interest on
    // index-linked gilts, so the line says debt, not spending; its sources say why.
    const intro = within(third).getByText(/^Since March, interest rates and inflation/);
    expect(intro).toHaveTextContent(
      /^Since March, interest rates and inflation have been higher than expected\. This means the government is paying more money to borrow, and paying more on debt linked to inflation\./,
    );
    expect(intro).toHaveTextContent(/largely reflecting weaker RPI inflation/);
    expect(intro).not.toHaveTextContent(/spending linked to inflation/);
    // The OBR is first named in the rows on a basic page, so its full name is a tap away there.
    expect(within(third).getByRole('button', { name: 'OBR’s' })).toBeInTheDocument();
    expect(rows()).toEqual([
      ['The OBR’s March forecast', '£23.6bn', 'Official figure'],
      ['Higher interest rates', '−£11.3bn', 'Assumption'],
      ['Higher inflation', '−£5.5bn', 'Assumption'],
      ['Today’s estimate', '£6.8bn', 'Assumption'],
    ]);
    // The rows add up as shown, and the last is the figure the briefing opens with.
    const shown = rows().map(([, figure]) => bn(figure));
    expect(shown[0]! + shown[1]! + shown[2]!).toBeCloseTo(shown[3]!, 9);
    expect(rows()[3]![1]).toBe(within(part('Your headroom')).getByRole('strong').textContent);
    // Where the rows come from, with the workings on: the forecast, the sensitivities, the readings.
    const sources = third.querySelector('.calc + .briefing__sources') as HTMLElement;
    expect(sources).toHaveTextContent(/Table 5\.1/);
    expect(sources).toHaveTextContent(/A sustained 1 percentage point increase in Bank Rate/);
    expect(sources).toHaveTextContent(/A 1 percentage point increase in RPI inflation/);
    const main = document.querySelector('main')?.textContent ?? '';
    // Every placeholder filled, the folds' included: they are on the page, closed.
    expect(main).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(main).not.toMatch(/your target|headroom target|want to keep/i);
    // The £10bn advice gave way to the buffer line in part 1 (revised 2026-09-29).
    expect(main).not.toMatch(/aim to keep more than|markets get nervous/);
    expect(main).not.toMatch(/£20bn/);
    expect(main).not.toMatch(/That is why your headroom/);
  });

  it('says what is already on the desk: a bill promised and a cliff edge set', () => {
    at(`/outlook?${BASE}`);
    const tray = part('Already on your desk');
    const items = within(tray).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(
      /Official figure The defence plan’s last £4\.7bn, over four years, is still to be found/,
    );
    // The cliff edge's figure is the lever's own, switched on, on today's estimate.
    expect(items[1]).toHaveTextContent(
      /Assumption VAT on home electricity goes back to 5% in April 2027 unless you keep the cut: about £1\.\dbn a year\./,
    );
  });

  it('keeps the rules in full, what changed since March and why forecasts move one fold away', () => {
    at(`/outlook?${BASE}`);
    for (const name of [
      'About the fiscal rules',
      'What changed since March',
      'Why forecasts move',
    ]) {
      expect(screen.getByText(name).closest('details'), name).not.toHaveAttribute('open');
    }
    fireEvent.click(screen.getByText('About the fiscal rules'));
    const rulesFold = screen.getByText('About the fiscal rules').closest('details') as HTMLElement;
    // The plain names the rest of the game uses, tied to the official ones (Phase 25).
    expect(within(rulesFold).getByText(/^The day-to-day rule/)).toHaveTextContent(
      'The day-to-day rule (officially the Stability rule)',
    );
    expect(within(rulesFold).getByText(/^The debt rule/)).toHaveTextContent(
      'The debt rule (officially the Investment rule)',
    );
    expect(within(rulesFold).getByText(/^The welfare cap/)).toHaveTextContent(/^The welfare cap$/);
    // With the workings on, the Charter's own words and their source sit beside each rule.
    expect(within(rulesFold).getAllByText(/The Charter says:/).length).toBe(3);

    // What changed since March: the honest reading. Dearer borrowing and prices ate the headroom;
    // the decisions moved money.
    fireEvent.click(screen.getByText('What changed since March'));
    const since = screen.getByText('What changed since March').closest('details') as HTMLElement;
    const why = within(since).getByText(/Gilts pay/);
    expect(why).toHaveTextContent(/^Gilts pay 5\.29% against the 4\.5% the OBR assumed\./);
    // An average to 2030, said as one, so it never reads as today's inflation.
    expect(why).toHaveTextContent(
      /Forecasters expect prices to rise 3\.3% a year on average to 2030, not the OBR’s 2\.8%\. Some government debt costs more when prices rise\.$/,
    );
    expect(
      within(since).getByText(/^Since March the government has taken three decisions/),
    ).toHaveTextContent(/Each was paid for by moving money, so none used the headroom\.$/);
    const items = within(since).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      /£850 million\. Paid for by cancelling the Digital ID programme\./,
    );
    expect(items[2]).toHaveTextContent(
      /£60 million\. Paid for by £40 million from Work and Pensions/,
    );
    // No bracketed periods, and no sum under a billion rounded to "£0.1bn".
    for (const item of items) expect(item.textContent).not.toMatch(/\((20\d\d|from )|£0\.\dbn/);

    // Why forecasts move: the adviser's note, a judgement, with estimates on both sides.
    fireEvent.click(screen.getByText('Why forecasts move'));
    const note = screen.getByRole('complementary', { name: /Why forecasts move/ });
    expect(within(note).getByText('Chief Economic Adviser')).toBeInTheDocument();
    expect(within(note).getByText('Game judgement')).toBeInTheDocument();
    expect(
      within(note).getByText(/the OBR’s tax forecasts have been out by about £3\dbn on average/),
    ).toBeInTheDocument();
    expect(
      within(note).getByText(/The Resolution Foundation said about £10bn in July/),
    ).toBeInTheDocument();
    expect(
      within(note).getByText(/^In a real Budget the OBR sends the Chancellor several rounds/),
    ).toHaveTextContent(/Here one estimate stays fixed\.$/);
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

  it('shows how the estimate is made, with the workings on', () => {
    at(`/outlook?${BASE}`);
    fireEvent.click(screen.getByText('How the estimate is made'));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Setting used')).toBeInTheDocument();
    // The gilt yield sets interest rates three-quarters of a point above the OBR's path.
    expect(within(table).getByText('+0.75 points')).toBeInTheDocument();
    // How that setting is applied, and which way it leans, as an assumption (Phase 25).
    const method = screen.getByText(/we apply it to the rise in gilt yields alone/);
    expect(method).toHaveTextContent(/so the estimate leans cautious\./);
    expect(within(method).getByText('Assumption')).toBeInTheDocument();
    expect(within(table).getByText('10-year gilt yield')).toBeInTheDocument();
    expect(within(table).getByText('Borrowing so far in 2026-27')).toBeInTheDocument();
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

describe('the briefing in basic mode (Phase 27, ADR-0028; Phase 28)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('keeps the three parts and the desk, and leaves the folds for advanced mode', () => {
    at(`/outlook?${BASE}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    expect(headings()).toEqual([
      'Your headroom',
      'What is headroom?',
      'How the headroom is calculated',
      'Already on your desk',
    ]);
    expect(rows()).toHaveLength(4);
    expect(screen.getByText(/Chancellors have kept about £29bn/)).toBeInTheDocument();
    expect(screen.getByText(/plans to sell £246bn/)).toBeInTheDocument();
    expect(screen.getByText(/Lenders charge more/)).toBeInTheDocument();
    expect(
      screen.getByText(/to find around £22bn to build in a sensible buffer/),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Since March, interest rates and inflation/)).toBeInTheDocument();
    expect(screen.queryByText('About the fiscal rules')).toBeNull();
    expect(screen.queryByText('What changed since March')).toBeNull();
    expect(screen.queryByText('Why forecasts move')).toBeNull();
    // With the workings on, the table the estimate is made from, as in advanced mode.
    expect(screen.getByText('How the estimate is made')).toBeInTheDocument();
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
  });

  it('reads the full briefing with one button, which keeps the focus', () => {
    at(`/outlook?${BASE}`);
    const button = screen.getByRole('button', { name: 'Read the full briefing' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByText('About the fiscal rules')).toBeInTheDocument();
    expect(screen.getByText('What changed since March')).toBeInTheDocument();
    expect(screen.getByText('Why forecasts move')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the short briefing' })).toBe(button);
    expect(document.activeElement).toBe(button);
    const line = document.querySelector('.mode-line') as HTMLElement;
    expect(within(line).getByRole('status')).toHaveTextContent('The full briefing is on show.');
    // A briefing is explanations, not ideas: no shortlist and no badge on this line.
    expect(within(line).queryByText('Game judgement')).toBeNull();
  });
});
