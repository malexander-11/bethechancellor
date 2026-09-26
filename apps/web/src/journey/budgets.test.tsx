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

/**
 * Visible words of a screen with no beats: everything in the main column before any disclosure
 * is opened, less the road, the footer and what only a screen reader hears.
 */
function screenWords(): number {
  const main = document.querySelector('main');
  if (!main) return 0;
  const clone = main.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('details, .speech, .sr-only, table, nav.progress, footer')
    .forEach((el) => el.remove());
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
    // The hand-off beats are being retired screen by screen (Phase 20); only the ceiling holds.
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
    // One priority a screen: the widest has five cards, each with its lead's line, the figure
    // with the headroom it would leave, its tags and the options it overlaps, under the bar and
    // the lead's brief. Then paying for it: all twenty-six ways on one screen, in five groups by
    // who pays, each a title, a headline, a figure and its tags. Measured on 2026-09-26 at 316
    // to 388 words a priority screen and 819 for paying, and pinned with about a tenth to spare.
    const widest =
      'g=s.1_st.2_pl.adviser_hr.20_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';
    for (const [path, limit] of [
      ['/budget/deliver', 430],
      ['/budget/deliver/2', 430],
      ['/budget/deliver/3', 430],
    ] as const) {
      const view = at(`${path}?${BASE}&${widest}`);
      const n = screenWords();
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      expect(n).toBeGreaterThan(100);
      view.unmount();
    }
    const afford = at(`/budget/afford?${BASE}&${GAME}`);
    const m = screenWords();
    expect(m, `/budget/afford shows ${m} words`).toBeLessThanOrEqual(900);
    expect(m).toBeGreaterThan(400);
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
        const n = screenWords();
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
    // with its adviser's short line, the headroom it would leave and the options it overlaps, so
    // it gets a hundred words more than the outlook (ADR-0022, revised 2026-09-26: 360 → 400).
    for (const [path, limit] of [
      ['/outlook', 300],
      ['/rabbit', 400],
    ] as const) {
      const view = at(`${path}?${BASE}&${GAME}`);
      const n = liveBeatWords();
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      view.unmount();
    }
  });
});
