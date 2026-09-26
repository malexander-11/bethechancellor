import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const KEY = 'btc.workings.v1';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const sourceLinks = () => document.querySelectorAll('.source a').length;
/** A link that carries a Budget opens every beat; a bare one asks for a Continue first. */
function cont() {
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
}
const theSwitch = () => screen.getByRole('switch', { name: 'Show workings' });

describe('the "Show workings" switch', () => {
  // The shared setup turns the workings on for every other test; here the app is met as a
  // newcomer meets it.
  beforeEach(() => window.localStorage.removeItem(KEY));

  it('is off by default: plain numbers and badges, no source links, no drawers', () => {
    at(`/budget/taxes?${BASE}&L=itbr.1`);
    cont();
    expect(theSwitch()).not.toBeChecked();
    expect(document.querySelector('main')?.getAttribute('data-workings')).toBe('off');
    expect(sourceLinks()).toBe(0);
    expect(screen.queryByRole('button', { name: /Detail and sources/ })).toBeNull();
    // The badges that say what kind of number something is stay whatever the switch says.
    expect(screen.getAllByText('Direct costing').length).toBeGreaterThan(0);
    // The expert controls and the ready-made Budgets are workings too.
    expect(screen.queryByText(/Charge interest on extra borrowing/)).toBeNull();
    expect(screen.queryByText('Try a ready-made Budget')).toBeNull();
    // The footer says where the sources went.
    expect(screen.getByText(/Every figure is sourced/)).toBeInTheDocument();
  });

  it('puts everything back when switched on, and remembers the choice', () => {
    at(`/budget/taxes?${BASE}&L=itbr.1`);
    cont();
    fireEvent.click(theSwitch());
    expect(theSwitch()).toBeChecked();
    expect(document.querySelector('main')?.getAttribute('data-workings')).toBe('on');
    expect(sourceLinks()).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Detail and sources/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Charge interest on extra borrowing/)).toBeInTheDocument();
    expect(screen.queryByText(/Every figure is sourced/)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe('on');
  });

  it('comes back as it was left', () => {
    window.localStorage.setItem(KEY, 'on');
    const view = at(`/budget/taxes?${BASE}&L=itbr.1`);
    cont();
    expect(theSwitch()).toBeChecked();
    expect(sourceLinks()).toBeGreaterThan(0);
    view.unmount();
    window.localStorage.setItem(KEY, 'off');
    at(`/budget/taxes?${BASE}&L=itbr.1`);
    cont();
    expect(theSwitch()).not.toBeChecked();
    expect(sourceLinks()).toBe(0);
  });

  it('hides the close’s tables on Budget day until it is switched on', () => {
    at(`/budget-day?${BASE}&L=itbr.1`);
    // A sandbox link opens every beat, so the close is on the page at once. The Red Book's
    // table of decisions is part of the story and stays; the rules in full and the charts wait.
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    expect(screen.queryByText('The rules in full')).toBeNull();
    expect(screen.queryByText('Five-year paths')).toBeNull();
    expect(screen.getByRole('button', { name: /Copy a link/ })).toBeInTheDocument();
    fireEvent.click(theSwitch());
    expect(screen.getByText('The rules in full')).toBeInTheDocument();
    expect(screen.getByText('Five-year paths')).toBeInTheDocument();
  });

  it('is off on the opening screen, and the header switch is the one way to turn it on', () => {
    at('/');
    // The opening carries no toggles of its own: one sentence, the playtime and the button.
    expect(screen.queryByRole('checkbox', { name: /Show the workings/ })).toBeNull();
    expect(theSwitch()).not.toBeChecked();
    fireEvent.click(theSwitch());
    expect(theSwitch()).toBeChecked();
    expect(window.localStorage.getItem(KEY)).toBe('on');
  });

  it('is always on, and cannot be moved, on the pages that are the workings', () => {
    window.localStorage.setItem(KEY, 'off');
    at('/about');
    expect(theSwitch()).toBeChecked();
    expect(theSwitch()).toBeDisabled();
    expect(document.querySelector('main')?.getAttribute('data-workings')).toBe('on');
  });
});
