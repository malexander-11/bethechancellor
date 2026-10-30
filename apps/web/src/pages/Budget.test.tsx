import { smallPrint } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget } from '../data';
import { BUDGET_TEXT } from './Budget';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const search = () => new URLSearchParams(window.location.search);

describe('the Chancellor’s Budget (ADR-0045)', () => {
  it('tells the story with every figure filled, then the walk ahead theme by theme', () => {
    at(`/?${BASE}`);
    const main = document.querySelector('main') as HTMLElement;
    // No placeholder is left unfilled anywhere on the page, and the story's figures are the
    // engine's: the headroom the Budget left is the one the walk keeps to.
    expect(main.textContent).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(within(main).getAllByText(/£14\.5bn/).length).toBeGreaterThan(0);
    // The walk (ADR-0046): every theme with how many measures it asks about, then the small print.
    const themes = screen.getByRole('region', { name: BUDGET_TEXT.themes });
    for (const theme of budget.themes) {
      const item = within(themes).getByRole('button', { name: theme.title }).closest('li');
      expect(item?.textContent, theme.id).toContain(`${theme.cards.length} measures`);
    }
    expect(
      within(themes).getByText(`${smallPrint(budget).length} smaller measures to tick or cross`),
    ).toBeInTheDocument();
    // One primary button; no votes here, they are cast on the walk.
    expect(main.querySelectorAll('.btn--primary')).toHaveLength(1);
    expect(screen.getByRole('button', { name: BUDGET_TEXT.start })).toHaveClass('btn--primary');
    expect(screen.queryByRole('button', { name: /^Agree/ })).toBeNull();
    expect(main.querySelector('details')).toBeNull();
  });

  it('starts a game at the first theme, a link’s measures in it', async () => {
    at(`/?${BASE}&L=itbr.1`);
    fireEvent.click(screen.getByRole('button', { name: BUDGET_TEXT.start }));
    await waitFor(() => expect(search().get('g')).toBe('st.0_rd.3'));
    expect(search().get('L')).toBe('itbr.1');
    expect(
      screen.getByRole('heading', { level: 1, name: budget.themes[0]?.title }),
    ).toBeInTheDocument();
  });

  it('starts a game at any theme, or at the small print, straight from its name', async () => {
    const last = budget.themes[budget.themes.length - 1];
    const view = at(`/?${BASE}`);
    fireEvent.click(screen.getByRole('button', { name: last?.title }));
    expect(screen.getByRole('heading', { level: 1, name: last?.title })).toBeInTheDocument();
    await waitFor(() => expect(search().get('g')).toBe('st.0_rd.3'));
    view.unmount();
    at(`/?${BASE}`);
    fireEvent.click(screen.getByRole('button', { name: BUDGET_TEXT.rest }));
    expect(screen.getByRole('heading', { level: 1, name: BUDGET_TEXT.rest })).toBeInTheDocument();
  });
});
