import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game that has reached the rabbit with the envelope open, so every stage renders its beats.
const GAME =
  'g=s.1_st.5_pl.adviser_hr.20_pr.defence+safer-streets_rv.1&M=rate.0.75_rpi.0.5&L=moj.10';

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
    // The desk's two screens are side rooms with a game under way: no hand-off, so no Continue.
    const stages = [
      '/outlook',
      '/pm',
      '/budget/deliver',
      '/budget/afford',
      '/budget/taxes',
      '/budget/spending',
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
    expect(total).toBeGreaterThanOrEqual(7);
  });

  it('opens every stage with a hand-off of at most 180 visible words', () => {
    for (const path of ['/pm', '/budget/deliver', '/budget/afford', '/forecast']) {
      const view = at(`${path}?${BASE}&${GAME}`);
      const n = liveBeatWords();
      expect(n, `${path} opens with ${n} words`).toBeLessThanOrEqual(180);
      view.unmount();
    }
  });

  it('keeps the guided screens of the package inside a budget', () => {
    // Three priorities with the most options between them (fourteen cards), each with its lead's
    // line, the figure and its tags: the widest the ways to deliver can be (ADR-0022).
    const widest =
      'g=s.1_st.2_pl.adviser_hr.20_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';
    const deliver = at(`/budget/deliver?${BASE}&${widest}`);
    pressThrough();
    const n = liveBeatWords();
    expect(n, `/budget/deliver shows ${n} words`).toBeLessThanOrEqual(750);
    expect(n).toBeGreaterThan(300);
    deliver.unmount();
    // The ways to afford: five who-pays tabs, each read on its own.
    const afford = at(`/budget/afford?${BASE}&${GAME}`);
    pressThrough();
    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const m = liveBeatWords();
      expect(m, `/budget/afford shows ${m} words with ${tab.textContent} open`).toBeLessThanOrEqual(
        500,
      );
      expect(m).toBeGreaterThan(100);
    }
    afford.unmount();
  });

  it('keeps the desk’s screens inside a budget, whichever group is open', () => {
    // The scorecard, the strip, the tabs, the open group with its ministers, the running list:
    // everything a player sees while they work, before any disclosure is opened.
    const limits = { '/budget/taxes': 500, '/budget/spending': 700 } as const;
    for (const [path, limit] of Object.entries(limits)) {
      const view = at(`${path}?${BASE}&${GAME}`);
      pressThrough();
      let widest = 0;
      for (const tab of screen.getAllByRole('tab')) {
        fireEvent.click(tab);
        const n = liveBeatWords();
        widest = Math.max(widest, n);
        expect(n, `${path} shows ${n} words with ${tab.textContent} open`).toBeLessThanOrEqual(
          limit,
        );
      }
      expect(widest).toBeGreaterThan(100);
      view.unmount();
    }
  });

  it('keeps the one-screen decisions to a few hundred visible words', () => {
    // The outlook and the add-ons have no hand-off: the screen is the decision, a handful of
    // cards and a note. Still a game, not a lecture. The add-ons screen carries ten cards, each
    // with its adviser's short line, so it gets sixty words more than the outlook (ADR-0022).
    for (const [path, limit] of [
      ['/outlook', 300],
      ['/rabbit', 360],
    ] as const) {
      const view = at(`${path}?${BASE}&${GAME}`);
      const n = liveBeatWords();
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      view.unmount();
    }
  });
});
