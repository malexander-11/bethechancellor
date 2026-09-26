import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game at its final choices with the forecast open, two priorities delivered, one way to pay,
// one add-on: every screen renders in its working state, and the review and the close have
// something to say.
const GAME =
  'g=s.1_st.5_pl.adviser_hr.20_pr.defence+safer-streets_rv.1_rb.pubs&M=rate.0.75_rpi.0.5&L=moj.10_dip47.1_hscl.1_alc.-5&S=moj.10_dip47.1_hscl.1';
// Three priorities with the most options between them: the widest the priority screens get.
const WIDEST =
  'g=s.1_st.2_pl.adviser_hr.20_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Visible words of a screen: everything in the main column before any fold is opened, less the
 * road, the footer and what only a screen reader hears. What a newcomer has to read to decide.
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

/** Every screen of the main road, in order, with the game that renders it at its widest. */
const ROAD: readonly [path: string, limit: number, game: string][] = [
  ['/', 90, GAME],
  ['/outlook', 300, GAME],
  ['/pm', 220, GAME],
  ['/budget/deliver', 350, WIDEST],
  ['/budget/deliver/2', 350, WIDEST],
  ['/budget/deliver/3', 350, WIDEST],
  ['/budget/afford', 620, GAME],
  ['/forecast', 150, GAME],
  ['/compromise', 340, GAME],
  ['/rabbit', 430, GAME],
  ['/review', 140, GAME],
  ['/budget-day', 580, GAME],
];

describe('the word budgets', () => {
  // The budgets are what a newcomer sees, and a newcomer sees the game with the workings off.
  beforeEach(() => window.localStorage.removeItem('btc.workings.v1'));

  it('has no Continue anywhere, no tab on the main road, and one primary action a screen', () => {
    for (const [path, , game] of ROAD) {
      const view = at(`${path}?${BASE}&${game}`);
      expect(
        screen.queryByRole('button', { name: /Continue/ }),
        `${path} has a Continue`,
      ).toBeNull();
      expect(screen.queryAllByRole('tab'), `${path} has tabs`).toHaveLength(0);
      const primaries = document.querySelectorAll('main .btn--primary').length;
      expect(primaries, `${path} has ${primaries} primary actions`).toBe(1);
      view.unmount();
    }
  });

  it('keeps every screen of the main road inside its word budget', () => {
    // Measured on 2026-09-26 with the folds closed and pinned with about a tenth to spare
    // (ADR-0023): the opening 60, the position 267, the priorities 192, the priority screens 244
    // to 316, paying for it 564 (the first three ways of each group on show), the forecast 126,
    // the sums 302, the add-ons 391, the review 121, Budget day 529.
    for (const [path, limit, game] of ROAD) {
      const view = at(`${path}?${BASE}&${game}`);
      const n = screenWords();
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      expect(n, `${path} shows ${n} words`).toBeGreaterThan(30);
      view.unmount();
    }
  });

  it('keeps the desk’s screens inside a budget, whichever group is open', () => {
    // The side room: the bar, the folded briefing, the tabs, the open group with its ministers,
    // the running list: everything a player sees while they work, before any fold is opened.
    const limits = { '/budget/taxes': 500, '/budget/spending': 700 } as const;
    for (const [path, limit] of Object.entries(limits)) {
      const view = at(`${path}?${BASE}&${GAME}`);
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
});
