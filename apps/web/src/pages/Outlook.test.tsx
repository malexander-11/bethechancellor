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

  it('asks for a headroom target and explains the £20bn rule of thumb as a judgement', () => {
    at(`/outlook?${BASE}`);
    const targets = screen.getByRole('radiogroup', { name: 'Headroom target' });
    expect(within(targets).getAllByRole('radio')).toHaveLength(4);
    expect(within(targets).getByRole('radio', { name: /£20bn/ })).toBeChecked();
    // The Treasury's briefing leads with three numbers, headroom first, explained where it stands.
    expect(screen.getByText('Room to spend')).toBeInTheDocument();
    expect(screen.getByText('£23.6bn')).toBeInTheDocument();
    expect(screen.getByText('Borrowing costs')).toBeInTheDocument();
    // The £20bn rule of thumb is a judgement, badged, one fold away.
    fireEvent.click(screen.getByText('Why about £20bn?'));
    const note = screen.getByRole('complementary', { name: /rule of thumb/ });
    expect(within(note).getByText('Simulated')).toBeInTheDocument();
    expect(within(note).getByText(/Nobody has published that number/)).toBeInTheDocument();
    // What the government has already decided since March, on its own figures, behind "See the numbers".
    fireEvent.click(screen.getByText('See the numbers'));
    const since = screen.getByRole('region', { name: 'Decided since March' });
    expect(within(since).getByText(/VAT taken off domestic electricity/)).toBeInTheDocument();
    expect(within(since).getByText(/£2 bus fare cap/)).toBeInTheDocument();
    expect(within(since).getByText(/Free bus travel for disabled people/)).toBeInTheDocument();
    expect(within(since).getAllByRole('row')).toHaveLength(4);
    expect(within(since).getByText(/none used March’s headroom/)).toBeInTheDocument();
    // The sliders behind the cards are in the same fold, for anyone who wants them.
    expect(screen.getByText('Set your own figures')).toBeInTheDocument();
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
