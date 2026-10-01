import { render, screen } from '@testing-library/react';
import { appendFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_TEXT } from '../board/words';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
// A game at the review on today's estimate, two priorities delivered and employer National
// Insurance two points up: every screen renders in its working state, and the review and Budget
// day have something to say.
const GAME = 'g=st.4_pr.defence+safer-streets&M=rate.0.75_rpi.0.5&L=moj.10_dip47.1_nicer.2';
// The same game with a tax chosen in six of the tax screen's decisions and a budget, a benefit and
// one of last year's decisions chosen on the spending screen: the decisions holding a choice open
// on arrival (ADR-0035, ADR-0037), so this is the widest those screens get.
const TUNED = GAME.replace(
  'L=moj.10_dip47.1_nicer.2',
  'L=moj.10_dip47.1_nicer.2_vatr.1_wealth2.1_banklevy.1_iinc2.1_apd.2_otherd.-1_woth.-1_rvplan2.1',
);
// Three priorities with the most options between them: the widest the priority screens get.
const WIDEST = 'g=st.2_pr.cost-of-living+welfare-bill+homes-growth&M=rate.0.75_rpi.0.5';

/**
 * The most words a screen may show before any fold is opened, by the kind of screen it is. One cap
 * a kind, not a count a screen: a change of words needs no new number here unless a screen outgrows
 * its kind, and then it is the screen that should change.
 */
const CAP = {
  /** The premise and one button. */
  cover: 30,
  /** One thing to read or one question to answer: the briefing, the priorities, the flagship
   * policies and the review. */
  story: 250,
  /**
   * Budget day: three rated audiences and five households, open on the page (ADR-0043), then the
   * Budget to share and the way onto the leaderboard (ADR-0044).
   */
  feedback: 460,
  /** A fine-tuning screen, its decisions closed but for any the game has made a choice in. */
  tuning: 450,
  /** The same with the widest game: every decision holding a choice open, every choice in it. */
  tuningOpen: 700,
} as const;

type Mode = 'basic' | 'advanced';

/**
 * Every screen of the main road with the game that renders it at its widest and the mode it is
 * read in (Phase 27): a screen basic mode trims (step 3's) is read in both, the rest in basic, the
 * mode a first game is played in.
 */
const ROAD: readonly { path: string; kind: keyof typeof CAP; game: string; mode: Mode }[] = [
  { path: '/', kind: 'cover', game: GAME, mode: 'basic' },
  { path: '/outlook', kind: 'story', game: GAME, mode: 'basic' },
  { path: '/pm', kind: 'story', game: GAME, mode: 'basic' },
  ...(['basic', 'advanced'] as const).flatMap((mode) =>
    ['/budget/deliver', '/budget/deliver/2', '/budget/deliver/3'].map((path) => ({
      path,
      kind: 'story' as const,
      game: WIDEST,
      mode,
    })),
  ),
  ...['/finetune/tax', '/finetune/spending'].flatMap((path) => [
    { path, kind: 'tuning' as const, game: GAME, mode: 'basic' as const },
    { path, kind: 'tuningOpen' as const, game: TUNED, mode: 'basic' as const },
  ]),
  { path: '/review', kind: 'story', game: GAME, mode: 'basic' },
  { path: '/budget-day', kind: 'feedback', game: GAME, mode: 'basic' },
];

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** A fresh browser is in basic mode; advanced is remembered once chosen. */
function inMode(mode: Mode) {
  if (mode === 'basic') window.localStorage.removeItem('btc.mode.v1');
  else window.localStorage.setItem('btc.mode.v1', 'advanced');
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
    .querySelectorAll('details, .sr-only, table, nav.progress, footer')
    .forEach((el) => el.remove());
  return words(clone.textContent ?? '');
}

describe('the word budgets', () => {
  // The leaderboard is open, so Budget day shows the way onto it (ADR-0044) and is read at its
  // widest.
  beforeEach(() => {
    vi.stubGlobal('fetch', async (input: string) =>
      input === '/api/health'
        ? new Response(JSON.stringify({ ok: true, db: 'ok' }))
        : new Response('{}', { status: 404 }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(ROAD)(
    '$path in $mode mode ($kind): one way on, and no more words than its kind allows',
    async ({ path, kind, game, mode }) => {
      inMode(mode);
      at(`${path}?${BASE}&${game}`);
      if (kind === 'feedback') await screen.findByLabelText(BOARD_TEXT.postLabel);
      // No Continue, no tabs, one primary action (ADR-0024).
      expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
      expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
      const n = screenWords();
      // Set WORDS to a file path to write the counts out.
      if (process.env.WORDS) {
        appendFileSync(process.env.WORDS, `${path} (${kind}), ${mode}: ${n} words\n`);
      }
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(CAP[kind]);
      // A floor against an empty render.
      expect(n, `${path} shows ${n} words`).toBeGreaterThan(10);
    },
  );
});
