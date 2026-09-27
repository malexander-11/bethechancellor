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

describe('choosing what to plan on', () => {
  it('is where the old assumptions link now lands', () => {
    at(`/assumptions?${BASE}`);
    expect(screen.getByText('Your starting position')).toBeInTheDocument();
  });

  it('briefs in three numbers and one line on the rules, with the rules in full one fold away', () => {
    at(`/outlook?${BASE}`);
    expect(screen.getByText('Room to spend')).toBeInTheDocument();
    expect(screen.getByText('£23.6bn')).toBeInTheDocument();
    expect(screen.getByText('Borrowing costs')).toBeInTheDocument();
    // The line carries glossary terms, so it is matched on a plain run and read whole.
    expect(screen.getByText(/pay for day-to-day spending with tax by 2029-30/)).toHaveTextContent(
      /^Two rules: pay for day-to-day spending with tax by 2029-30, and have debt falling by then\. Miss one and the OBR says so on Budget day\.$/,
    );
    fireEvent.click(screen.getByText('About the fiscal rules'));
    const fold = screen.getByText('About the fiscal rules').closest('details') as HTMLElement;
    expect(within(fold).getByText('Stability rule')).toBeInTheDocument();
    expect(
      within(fold).getByText(/Day-to-day spending must be covered by tax/),
    ).toBeInTheDocument();
    expect(within(fold).getByText('Welfare cap')).toBeInTheDocument();
    // With the workings on, the Charter's own words and their source sit beside each rule.
    expect(within(fold).getAllByText(/The Charter says:/).length).toBe(3);
  });

  it('says what has been promised since March, and what has actually cut the headroom', () => {
    at(`/outlook?${BASE}`);
    const since = screen.getByRole('region', { name: 'Since March' });
    expect(within(since).getByText(/three spending promises/)).toBeInTheDocument();
    expect(within(since).getAllByRole('listitem')).toHaveLength(3);
    expect(within(since).getByText(/VAT taken off domestic electricity/)).toBeInTheDocument();
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
      /Your adviser’s card shows what that does: £6\.8bn where March showed £23\.6bn/,
    );
    expect(screen.queryByText('See the numbers')).toBeNull();
  });

  it('asks its two questions outright, and explains headroom beneath the second', () => {
    at(`/outlook?${BASE}`);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Nobody knows what the economy will do by Budget day. Which forecast will you plan on?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('How much headroom do you want to keep?')).toBeInTheDocument();
    const targets = screen.getByRole('radiogroup', { name: 'Headroom target' });
    expect(within(targets).getAllByRole('radio')).toHaveLength(4);
    expect(within(targets).getByRole('radio', { name: /£20bn/ })).toBeChecked();
    expect(screen.queryByText('Why about £20bn?')).toBeNull();
    fireEvent.click(screen.getByText('What is headroom?'));
    const note = screen.getByRole('complementary', { name: /Headroom, explained/ });
    expect(within(note).getByText('Game judgement')).toBeInTheDocument();
    expect(
      within(note).getByText(/Headroom is the gap between what the rules let you borrow/),
    ).toBeInTheDocument();
    expect(within(note).getByText(/In March it was £23\.6bn/)).toBeInTheDocument();
    expect(within(note).getByText(/out by about £3\dbn on average/)).toBeInTheDocument();
    expect(within(note).getByText(/Nobody has published that number/)).toBeInTheDocument();
    // The sliders behind the cards are the expert path, behind the workings (on in this setup).
    fireEvent.click(screen.getByText('Set your own figures'));
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(3);
    // One primary action, and a way back.
    expect(screen.getByRole('button', { name: 'Set my starting position' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/(\?|$)/),
    );
  });

  it('mints a seed and carries the outlook and the target to Downing Street', async () => {
    at(`/outlook?${BASE}`);
    fireEvent.click(screen.getByRole('radio', { name: /A pessimistic analyst/ }));
    fireEvent.click(screen.getByRole('radio', { name: /£30bn/ }));
    fireEvent.click(screen.getByRole('button', { name: /Set my starting position/ }));
    expect(await screen.findByText('What is this Budget for?')).toBeInTheDocument();
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/^s\.\d+/);
      expect(g).toMatch(/pl\.pessimistic/);
      expect(g).toMatch(/hr\.30/);
      expect(g).toMatch(/st\.1/);
    });
  });

  it('keeps the same seed if the player comes back and confirms again', async () => {
    at(`/outlook?${BASE}&g=s.417_st.1_pl.adviser`);
    fireEvent.click(screen.getByRole('button', { name: /Set my starting position/ }));
    await waitFor(() => {
      const g = new URLSearchParams(window.location.search).get('g') ?? '';
      expect(g).toMatch(/^s\.417/);
    });
  });
});
