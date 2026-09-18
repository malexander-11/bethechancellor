import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game that has reached the rabbit with the envelope open, so every stage renders its beats.
const GAME =
  'g=s.1_st.5_pl.adviser_hr.20_th.security_pr.prisons+dip-gap_rv.1&M=rate.0.75_rpi.0.5&L=moj.10';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Visible words of the live beat: what is on the page before any disclosure is opened. */
function liveBeatWords(): number {
  const beats = document.querySelectorAll('section.beat');
  const live = beats[beats.length - 1];
  if (!live) return 0;
  const clone = live.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('details, .speech, .sr-only, table').forEach((el) => el.remove());
  return words(clone.textContent ?? '');
}

/** Press Continue until a step has no more, counting the presses. */
function pressThrough(): number {
  let n = 0;
  for (;;) {
    const go = screen.queryByRole('button', { name: /Continue/ });
    if (!go || (go as HTMLButtonElement).disabled) return n;
    fireEvent.click(go);
    n += 1;
  }
}

describe('the beat and word budgets', () => {
  // The budgets are what a newcomer sees, and a newcomer sees the game with the workings off.
  beforeEach(() => window.localStorage.removeItem('btc.workings.v1'));

  it('asks for at most twelve Continues across the whole journey', () => {
    const stages = [
      '/outlook',
      '/pm',
      '/budget/taxes',
      '/budget/spending',
      '/budget/policies',
      '/forecast',
      '/compromise',
      '/rabbit',
      '/budget-day',
    ];
    let total = 0;
    for (const path of stages) {
      const view = at(`${path}?${BASE}&${GAME}`);
      total += pressThrough();
      view.unmount();
    }
    expect(total).toBeLessThanOrEqual(12);
    expect(total).toBeGreaterThanOrEqual(8);
  });

  it('opens every stage with a hand-off of at most 180 visible words', () => {
    for (const path of ['/pm', '/budget/taxes', '/budget/spending', '/forecast']) {
      const view = at(`${path}?${BASE}&${GAME}`);
      const n = liveBeatWords();
      expect(n, `${path} opens with ${n} words`).toBeLessThanOrEqual(180);
      view.unmount();
    }
  });

  it('keeps the one-screen decisions to at most 300 visible words', () => {
    // The outlook and the rabbit have no hand-off: the screen is the decision, a handful of cards
    // and a note. Still a game, not a lecture.
    for (const path of ['/outlook', '/rabbit']) {
      const view = at(`${path}?${BASE}&${GAME}`);
      const n = liveBeatWords();
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(300);
      view.unmount();
    }
  });
});
