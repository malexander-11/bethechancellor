// What the fine-tuning screens' tests share: a game at step 4, and the ways into a screen's
// decisions, rows and bar (ADR-0035, ADR-0037).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

export const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has agreed two priorities with the PM and reached fine-tuning, on today's estimate. */
export const GAME = 'g=st.3_pr.safer-streets+defence&M=rate.0.75_rpi.0.5';

export function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
export const h1 = (name: RegExp | string) => screen.getByRole('heading', { level: 1, name });
export const group = (name: RegExp) => screen.getByRole('region', { name });
export const bar = () => screen.getByRole('region', { name: 'Your Budget so far' });
export const barFigure = () => bar().querySelector('.bar__figure')?.textContent ?? '';
/** The row a control sits in (ADR-0037). */
export const rowOf = (control: HTMLElement) => control.closest('.tune__row') as HTMLElement;
/** A scale's row, by what the row is called: its levels are one group of radios under that name. */
export const scale = (name: string) => rowOf(screen.getByRole('radiogroup', { name }));
/** A tick's row, by what the row is called. */
export const tickRow = (name: string) => rowOf(screen.getByRole('checkbox', { name }));
/** Any row, by what it is called: a flagship's row has no control to find it by. */
export const namedRow = (name: string) => {
  const found = [...document.querySelectorAll('.tune__row-name')].find(
    (n) => n.textContent === name,
  );
  if (!found) throw new Error(`no row “${name}”`);
  return found.closest('.tune__row') as HTMLElement;
};
/** A scale's levels, as its radios' labels read. */
export const levelsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('radio')
    .map((r) => r.closest('label')?.textContent);
/** What a row says at rest: what choosing would do. */
export const priceOf = (row: HTMLElement) =>
  row.querySelector('.tune__row-price')?.textContent ?? '';
/** What a row says once chosen: what it does. */
export const effectOf = (row: HTMLElement) =>
  row.querySelector('.tune__row-effect')?.textContent ?? '';
/** A decision's button, by its title: its name is the title, then where it stands. */
export const decision = (title: string) => {
  const button = screen
    .getAllByRole('button')
    .find((b) => b.querySelector('.tune__decision-title')?.textContent === title);
  if (!button) throw new Error(`no decision “${title}”`);
  return button;
};
/** Where a decision stands, as its button says. */
export const statusOf = (title: string) =>
  decision(title).querySelector('.tune__decision-status')?.textContent ?? '';
/** The panel a decision opens into. */
export const panelOf = (title: string) =>
  document.getElementById(decision(title).getAttribute('aria-controls') ?? '') as HTMLElement;
/** Open a decision (ADR-0035), and return the panel of its one card. */
export const openDecision = (title: string) => {
  fireEvent.click(decision(title));
  return panelOf(title);
};
/** The rows on show, by name, in order: flagships' rows among them. */
export const rowNames = (scope: ParentNode = document) =>
  [...scope.querySelectorAll('.tune__row-name')].map((n) => n.textContent ?? '');
export const search = () => new URLSearchParams(window.location.search);
