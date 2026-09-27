import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
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

  it('gives the headroom you have as one figure, our estimate, with the rules in one line', () => {
    at(`/outlook?${BASE}`);
    const facts = document.querySelector('.brief__facts') as HTMLElement;
    const headroom = within(facts).getByText('Your headroom').closest('div') as HTMLElement;
    expect(within(headroom).getByText('£6.8bn')).toBeInTheDocument();
    // Our estimate, not a published figure: it wears the Assumption badge and says so.
    expect(within(headroom).getByText('Assumption')).toBeInTheDocument();
    expect(
      within(headroom).getByText(/our estimate for 2029-30: the OBR’s March forecast on today’s/),
    ).toBeInTheDocument();
    expect(within(facts).getByText('Borrowing costs')).toBeInTheDocument();
    // The line carries glossary terms, so it is matched on a plain run and read whole.
    expect(screen.getByText(/pay for day-to-day spending with tax by 2029-30/)).toHaveTextContent(
      /^Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then\. Miss one and the OBR says so on Budget day\.$/,
    );
    fireEvent.click(screen.getByText('About the fiscal rules'));
    const fold = screen.getByText('About the fiscal rules').closest('details') as HTMLElement;
    expect(within(fold).getByText('Stability rule')).toBeInTheDocument();
    expect(within(fold).getByText('Welfare cap')).toBeInTheDocument();
    // With the workings on, the Charter's own words and their source sit beside each rule.
    expect(within(fold).getAllByText(/The Charter says:/).length).toBe(3);
  });

  it('says what has been promised since March, and why the headroom fell', () => {
    at(`/outlook?${BASE}`);
    const since = screen.getByRole('region', { name: 'Since March' });
    expect(within(since).getByText(/three spending promises/)).toBeInTheDocument();
    expect(within(since).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(since).getByText(/paid for by cancelling the Digital ID programme/),
    ).toBeInTheDocument();
    // The honest reading: the promises moved money; dearer borrowing is what ate the headroom.
    const why = within(since).getByText(
      /Each was paid for by moving money, so none used the headroom/,
    );
    expect(why).toHaveTextContent(/dearer borrowing and higher inflation/);
    expect(why).toHaveTextContent(/Gilts pay 5\.29% against the 4\.5% the OBR assumed/);
    expect(why).toHaveTextContent(
      /That is why your headroom is about £6\.8bn, not the £23\.6bn March showed\./,
    );
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
    expect(within(note).getByText(/Nobody has published that number/)).toBeInTheDocument();
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
    expect(within(table).getByText('+0.75 pp')).toBeInTheDocument();
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
