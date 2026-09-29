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

describe('the briefing: one estimate to plan on (Phase 24)', () => {
  it('is where the old assumptions link now lands', () => {
    at(`/assumptions?${BASE}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeInTheDocument();
  });

  it('gives the headroom you have as one figure, with its meaning beside it and the rules', () => {
    at(`/outlook?${BASE}`);
    const facts = document.querySelector('.brief__facts') as HTMLElement;
    const headroom = within(facts).getByText('Your headroom').closest('div') as HTMLElement;
    expect(within(headroom).getByText('£6.8bn')).toBeInTheDocument();
    // Our estimate, not a published figure: it wears the Assumption badge and says so.
    expect(within(headroom).getByText('Assumption')).toBeInTheDocument();
    // What headroom is, where the figure is (Phase 25), with the word a tap away.
    expect(within(headroom).getByRole('button', { name: 'Headroom' })).toBeInTheDocument();
    expect(
      within(headroom).getByText(
        /is how much you can spend, or cut in tax, and still meet the rules\./,
      ),
    ).toBeInTheDocument();
    // The year, once, in months; and what the figure is worth to a household, worked out.
    const year = within(headroom).getByText(/^It is for 2029-30/);
    expect(year).toHaveTextContent(
      /^It is for 2029-30 \(April 2029 to March 2030\), the year the rules are tested: about £2\d0 for each household Worked out\.$/,
    );
    expect(
      screen.getByText(
        /^Our estimate: the March forecast of the Office for Budget Responsibility \(OBR\), the official forecaster/,
      ),
    ).toBeInTheDocument();
    // One figure on the surface: the tiles for borrowing costs and borrowing so far went to the
    // workings table.
    expect(within(facts).queryByText('Borrowing costs')).toBeNull();
    expect(within(facts).queryByText('Borrowed so far this year')).toBeNull();
    // The advisers' yardstick, in words, and a judgement: no target to meet (ADR-0025).
    const yardstick = screen.getByText(/Your advisers call headroom under £10bn thin/);
    expect(yardstick).toHaveTextContent(/The markets notice\./);
    expect(within(yardstick).getByText('Game judgement')).toBeInTheDocument();
    // The line carries glossary terms, so it is matched on a plain run and read whole.
    expect(screen.getByText(/pay for day-to-day spending with tax by 2029-30/)).toHaveTextContent(
      /^Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then\. Miss one and the OBR says so on Budget day\.$/,
    );
    fireEvent.click(screen.getByText('About the fiscal rules'));
    const fold = screen.getByText('About the fiscal rules').closest('details') as HTMLElement;
    // The plain names the rest of the game uses, tied to the official ones (Phase 25).
    expect(within(fold).getByText(/^The day-to-day rule/)).toHaveTextContent(
      'The day-to-day rule (officially the Stability rule)',
    );
    expect(within(fold).getByText(/^The debt rule/)).toHaveTextContent(
      'The debt rule (officially the Investment rule)',
    );
    expect(within(fold).getByText(/^The welfare cap/)).toHaveTextContent(/^The welfare cap$/);
    // With the workings on, the Charter's own words and their source sit beside each rule.
    expect(within(fold).getAllByText(/The Charter says:/).length).toBe(3);
  });

  it('says what is already on the desk: a bill promised and a cliff edge set', () => {
    at(`/outlook?${BASE}`);
    const tray = screen.getByRole('region', { name: 'Already on your desk' });
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

  it('says why the headroom fell since March, with the decisions one fold away', () => {
    at(`/outlook?${BASE}`);
    const since = screen.getByRole('region', { name: 'Since March' });
    // The honest reading: the decisions moved money; dearer borrowing and prices ate the headroom.
    const why = within(since).getByText(/Since March the government has taken three decisions/);
    expect(why).toHaveTextContent(/Each was paid for by moving money, so none used the headroom/);
    expect(why).toHaveTextContent(/dearer borrowing and prices/);
    expect(why).toHaveTextContent(/Gilts pay 5\.29% against the 4\.5% the OBR assumed/);
    // An average to 2030, said as one, so it never reads as today's inflation.
    expect(why).toHaveTextContent(
      /Forecasters expect prices to rise 3\.3% a year on average to 2030, not the OBR’s 2\.8%/,
    );
    expect(why).toHaveTextContent(
      /That is why your headroom is about £6\.8bn, not the £23\.6bn March showed\./,
    );
    // The three decisions are folded, in millions where they are under a billion.
    const fold = within(since).getByText('What was decided since March').closest('details');
    expect(fold).not.toHaveAttribute('open');
    const items = within(fold as HTMLElement).getAllByRole('listitem', { hidden: true });
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      /£850 million\. Paid for by cancelling the Digital ID programme\./,
    );
    expect(items[2]).toHaveTextContent(
      /£60 million\. Paid for by £40 million from Work and Pensions/,
    );
    // No bracketed periods, and no sum under a billion rounded to "£0.1bn".
    for (const item of items) expect(item.textContent).not.toMatch(/\((20\d\d|from )|£0\.\dbn/);
  });

  it('asks nothing: no forecasts to choose, no target, no sliders; headroom explained one fold away', () => {
    at(`/outlook?${BASE}`);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText(/your target|headroom target|want to keep/i)).toBeNull();
    expect(screen.queryByText(/October forecast|October’s forecast/)).toBeNull();
    fireEvent.click(screen.getByText('What is headroom?'));
    const note = screen.getByRole('complementary', { name: /Headroom, explained/ });
    expect(within(note).getByText('Game judgement')).toBeInTheDocument();
    expect(
      within(note).getByText(/Headroom is the gap between what the rules let you borrow/),
    ).toBeInTheDocument();
    expect(within(note).getByText(/on today’s estimate it is £6\.8bn/)).toBeInTheDocument();
    expect(within(note).getByText(/out by about £3\dbn on average/)).toBeInTheDocument();
    expect(within(note).getByText(/below about £20bn/)).toBeInTheDocument();
    expect(within(note).getByText(/Nobody has published those numbers/)).toBeInTheDocument();
    // Estimates on both sides, and how a real Budget differs: the OBR's rounds and checks.
    expect(
      within(note).getByText(/The Resolution Foundation said about £10bn in July/),
    ).toBeInTheDocument();
    expect(
      within(note).getByText(/In a real Budget the OBR sends the Chancellor several rounds/),
    ).toHaveTextContent(/Here one estimate stays fixed\./);
    // One primary action, and a way back.
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
    // The two readings that left the surface are in the table.
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
    fireEvent.click(screen.getByRole('button', { name: 'Set your priorities' }));
    expect(await screen.findByText('What is this Budget for?')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.3_pr.defence');
      expect(search().get('L')).toBe('moj.10');
    });
  });
});

describe('the short briefing: basic mode (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('keeps the headroom, the rules in one line and the desk, and leaves the explanations out', () => {
    at(`/outlook?${BASE}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    const facts = document.querySelector('.brief__facts') as HTMLElement;
    expect(within(facts).getByText('£6.8bn')).toBeInTheDocument();
    expect(screen.getByText(/Your advisers call headroom under £10bn thin/)).toBeInTheDocument();
    expect(screen.getByText(/pay for day-to-day spending with tax by 2029-30/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Already on your desk' })).toBeInTheDocument();
    expect(screen.queryByText('About the fiscal rules')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Since March' })).toBeNull();
    expect(screen.queryByText('What is headroom?')).toBeNull();
    // With the workings on, the table the estimate is made from, as in advanced mode.
    expect(screen.getByText('How the estimate is made')).toBeInTheDocument();
    // One primary, still: the way on to the priorities.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
  });

  it('reads the full briefing with one button, which keeps the focus', () => {
    at(`/outlook?${BASE}`);
    const button = screen.getByRole('button', { name: 'Read the full briefing' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByText('About the fiscal rules')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Since March' })).toBeInTheDocument();
    expect(screen.getByText('What is headroom?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the short briefing' })).toBe(button);
    expect(document.activeElement).toBe(button);
    const line = document.querySelector('.mode-line') as HTMLElement;
    expect(within(line).getByRole('status')).toHaveTextContent('The full briefing is on show.');
    // A briefing is explanations, not ideas: no shortlist and no badge on this line.
    expect(within(line).queryByText('Game judgement')).toBeNull();
  });
});
