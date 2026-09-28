import { fireEvent, render, screen } from '@testing-library/react';
import { appendFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game at the review on today's estimate, two priorities delivered and the levy raised: every
// screen renders in its working state, and the review and the close have something to say.
const GAME = 'g=st.4_pr.defence+safer-streets&M=rate.0.75_rpi.0.5&L=moj.10_dip47.1_hscl.1';
// The same game with one folded lever moved in every group of the fine-tuning screens, so each
// group shows four: the widest those screens get on arrival.
const TUNED = GAME.replace(
  'L=moj.10_dip47.1_hscl.1',
  'L=moj.10_dip47.1_hscl.1_ipt.2_wealth2.1_banklevy.1_iinc2.1_apd.2_otherd.-1_woth.-1_rvplan2.1',
);
// Three priorities with the most options between them: the widest the priority screens get.
const WIDEST = 'g=st.2_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';

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
  ['/', 40, GAME],
  ['/outlook', 225, GAME],
  ['/pm', 155, GAME],
  ['/budget/deliver', 205, WIDEST],
  ['/budget/deliver/2', 205, WIDEST],
  ['/budget/deliver/3', 205, WIDEST],
  ['/finetune/tax', 660, GAME],
  ['/finetune/tax', 860, TUNED],
  ['/finetune/spending', 570, GAME],
  ['/finetune/spending', 775, TUNED],
  ['/review', 140, GAME],
  ['/budget-day', 210, GAME],
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
    // Measured on 2026-09-27 with the folds closed, after the words were halved (ADR-0023), and
    // pinned with about a tenth to spare: the opening 27, the priority screens 80 to 125, paying
    // for it 290 (the first three ways of each group on show), the sums 140 and the room to spare
    // 106, the add-ons 140, the review 98, Budget day 233. Re-measured the same day after the
    // starting position gained its rules line, its since-March account and its two questions,
    // the priorities their theme, and the forecast its visible disclosure (Phase 23): the
    // position 303, the priorities 138, the forecast 114. Re-measured again after every option
    // gained its adviser's line and the ways to pay their plain titles, and the voices at the top
    // of the option screens went: the priority screens 145 to 184, paying for it 536, the sums 147
    // and the room to spare 112, the add-ons 234, the review 105, Budget day 240. Then the
    // compromises became three screens, one question each: the sums 67, 73 and 43, the room to
    // spare 57, 44 and 46; every reception band was cut to twenty words: Budget day 205; and the
    // keep and go-further cards gained the Political Adviser's line: the add-ons 252. Paying for
    // it then became fine-tuning tax and spending, real levers with an adviser's line and a price
    // each (Phase 24): tax 531, spending 479 on arrival; 714 and 668 with one folded lever moved
    // in every group, so each group shows four. Then one estimate replaced the forecast cards and
    // the target, and the forecast, the compromises and the add-ons went (Phase 24, ADR-0025):
    // the briefing 201, the review 88, Budget day 188; tax 528 and 711, spending 476 and 665.
    // One price per choice (Phase 25): each fine-tuning card now says the headroom it would leave,
    // and each screen says once why that moves with interest; the review says how the headroom got
    // from the estimate to the bar, who pays most, and which priorities fall short: tax 599 and
    // 782, spending 515 and 704, the review 125.
    for (const [path, limit, game] of ROAD) {
      const view = at(`${path}?${BASE}&${game}`);
      const n = screenWords();
      if (process.env.WORDS)
        appendFileSync(process.env.WORDS, `${path}: ${n} words (limit ${limit})\n`);
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(limit);
      // A floor against an empty render: the opening screen is the shortest, at about thirty.
      expect(n, `${path} shows ${n} words`).toBeGreaterThan(20);
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
