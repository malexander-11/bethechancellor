import { render, screen } from '@testing-library/react';
import { appendFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_TEXT } from '../board/words';
import { budget } from '../data';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
// A game at the review, prisons a tenth up, the HMRC package dropped and employer National
// Insurance two points up: every screen renders in its working state, and the review and Budget
// day have something to say.
const GAME = 'g=st.2_rd.3&L=moj.10_b6hmrc.1_nicer.2';
// Every measure on the walk disagreed with: each card's answer pressed and its money line said.
const DISAGREED = `g=st.2_rd.3&L=${budget.themes
  .flatMap((t) => t.cards.map((c) => `${c.lever}.1`))
  .join('_')}`;
// Short of money on the balance page, and with money to spend: the two ways it opens.
const SHORT = 'g=st.1_rd.3&L=b6hmrc.1';
const SPARE = 'g=st.1_rd.3&L=b6ai.1_nicer.2';

/**
 * The most words a screen may show before any fold is opened, by the kind of screen it is. One cap
 * a kind, not a count a screen: a change of words needs no new number here unless a screen outgrows
 * its kind, and then it is the screen that should change.
 */
const CAP = {
  /** A page of the walk (ADR-0046): a theme's cards, each heading, meaning, figure and answer. */
  walk: 350,
  /** The walk's last page: every measure no card asks about, a line and a tick or cross each. */
  smallPrint: 900,
  /** The balance page (ADR-0046): the money, and the two menus of a dozen choices each. */
  menu: 360,
  /** One thing to read or one question to answer: the review. */
  story: 250,
  /**
   * Budget day: three rated audiences and five households, open on the page (ADR-0043), then the
   * Budget to share and the way onto the leaderboard (ADR-0044).
   */
  feedback: 470,
} as const;

/** Every screen of the main road with the game that renders it at its widest. */
const ROAD: readonly { path: string; kind: keyof typeof CAP; game: string }[] = [
  // The site opens on the walk's first page, with the welcome above it (ADR-0047).
  { path: '/', kind: 'walk', game: '' },
  ...budget.themes.flatMap((t) => [
    { path: `/measures/${t.id}`, kind: 'walk' as const, game: GAME },
    { path: `/measures/${t.id}`, kind: 'walk' as const, game: DISAGREED },
  ]),
  { path: '/measures/other', kind: 'smallPrint', game: GAME },
  { path: '/balance', kind: 'menu', game: SHORT },
  { path: '/balance', kind: 'menu', game: SPARE },
  { path: '/review', kind: 'story', game: GAME },
  { path: '/budget-day', kind: 'feedback', game: GAME },
];

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
    '$path ($kind, $game): one way on, and no more words than its kind allows',
    async ({ path, kind, game }) => {
      at(`${path}?${BASE}${game ? `&${game}` : ''}`);
      if (kind === 'feedback') await screen.findByLabelText(BOARD_TEXT.postLabel);
      // No Continue, no tabs, one primary action (ADR-0024).
      expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
      expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
      const n = screenWords();
      // Set WORDS to a file path to write the counts out.
      if (process.env.WORDS) {
        appendFileSync(process.env.WORDS, `${path} (${kind}): ${n} words\n`);
      }
      expect(n, `${path} shows ${n} words`).toBeLessThanOrEqual(CAP[kind]);
      // A floor against an empty render.
      expect(n, `${path} shows ${n} words`).toBeGreaterThan(10);
    },
  );
});
