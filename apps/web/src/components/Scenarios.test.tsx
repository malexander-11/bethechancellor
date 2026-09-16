import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

/** The assumptions step, with beat 1 open. A link carrying a budget opens every beat at once. */
function step(query = '') {
  const path = `/assumptions?${BASE}${query}`;
  window.history.replaceState(null, '', path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}

const card = (name: RegExp) =>
  screen.getByRole('radio', { name }).closest('.scenario') as HTMLElement;

/** The headroom printed on a card, in £bn. */
const headroom = (name: RegExp) => {
  const text = within(card(name)).getByText(/^[+−-]?£[\d.]+bn$/).textContent ?? '';
  return Number(text.replace(/[^\d.-]/g, '')) * (text.includes('−') ? -1 : 1);
};

describe('choosing the forecast you budget on', () => {
  it('offers four, with the March baseline chosen until you pick another', () => {
    step();
    const cards = screen.getByRole('radiogroup', { name: 'Economic assumptions' });
    expect(within(cards).getAllByRole('radio')).toHaveLength(4);
    expect(within(cards).getByRole('radio', { name: /Keep the March baseline/ })).toBeChecked();
    expect(screen.queryByText('Your own figures')).toBeNull();
  });

  it('sets every slider at once, and puts them in the link', async () => {
    step();
    fireEvent.click(screen.getByRole('radio', { name: /A pessimistic analyst/ }));
    expect(screen.getByRole('radio', { name: /A pessimistic analyst/ })).toBeChecked();
    // One click, three sliders: the whole point of replacing the readings grid with cards.
    expect(screen.getAllByRole('slider').map((s) => (s as HTMLInputElement).value)).toEqual([
      '0.75',
      '0',
      '1',
    ]);
    await waitFor(() => {
      const macro = new URLSearchParams(window.location.search).get('M') ?? '';
      expect(macro).toMatch(/rate\.0\.75/);
      expect(macro).toMatch(/rpi\.1/);
      // Growth stays on the OBR path, so it is a default and never reaches the query string.
      expect(macro).not.toMatch(/ngdp/);
    });
  });

  it('re-selects the card a shared link lands on', () => {
    step('&M=rate.-0.5');
    expect(screen.getByRole('radio', { name: /An optimistic analyst/ })).toBeChecked();
  });

  it('shows your own figures rather than pretending sliders set by hand are one of the four', () => {
    step('&M=rate.0.1');
    const cards = screen.getByRole('radiogroup', { name: 'Economic assumptions' });
    expect(
      within(cards)
        .getAllByRole('radio')
        .filter((r) => (r as HTMLInputElement).checked),
    ).toHaveLength(0);
    expect(screen.getByText('Your own figures')).toBeInTheDocument();
  });

  it('prices every card, so you can watch a Chancellor buy headroom by picking a forecast', () => {
    step();
    // The OBR's own published headroom, and the two directions away from it.
    expect(headroom(/Keep the March baseline/)).toBeCloseTo(23.6, 1);
    expect(headroom(/An optimistic analyst/)).toBeGreaterThan(headroom(/Keep the March baseline/));
    expect(headroom(/A pessimistic analyst/)).toBeLessThan(headroom(/Keep the March baseline/));
    expect(headroom(/Chief Economic Adviser/)).toBeLessThan(headroom(/Keep the March baseline/));
    // The thing this screen has to get right: a pessimist who leaves more headroom than your own
    // adviser reads as broken, whatever the card says to explain it.
    expect(headroom(/A pessimistic analyst/)).toBeLessThan(headroom(/Chief Economic Adviser/));
  });

  it('says on the card that its gloomiest rates figure is a gilt yield, not a forecast', () => {
    // The lesson that survived the reordering: gilt yields drive debt interest and nobody
    // forecasts them, so the worst published rates figure is today's market, not an analyst.
    step();
    const why = within(card(/A pessimistic analyst/)).getByText(/Where these figures come from/);
    fireEvent.click(why);
    expect(
      within(card(/A pessimistic analyst/)).getByText(/publishes a gilt yield/),
    ).toBeInTheDocument();
  });

  it('keeps the three sliders one click away, with their provenance', () => {
    step();
    expect(screen.getByText('Set your own figures')).toBeInTheDocument();
    expect(screen.getAllByText(/Advisers suggest/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(3);
  });
});
