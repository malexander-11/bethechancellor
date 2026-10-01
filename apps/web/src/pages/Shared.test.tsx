import {
  FINAL_STAGE,
  SHARE_WORDS,
  gameOutcomeOf,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { gameData, guide } from '../data';
import { SHARE_TEXT } from '../share/words';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A finished Budget: two priorities, prisons up a tenth and a penny on the basic rate. */
const FINISHED = `${BASE}&g=st.${FINAL_STAGE}_pr.defence+safer-streets&L=moj.10_itbr.1`;

function at(path: string) {
  // The provider reads the location itself, so set it before rendering, as a browser would.
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const outcomeOf = gameOutcomeOf(gameData);

/** What the page should say: the engine's own summary of the link. */
function summaryOf(search: string) {
  const budget = readFinishedBudget(gameData, search);
  if (!budget) throw new Error('not a finished Budget');
  return { budget, summary: summariseBudget(gameData, budget, outcomeOf) };
}

const stageTitle = (step: string) => guide.stages.find((s) => s.step === step)?.title ?? '';

describe('a shared Budget’s page (ADR-0044)', () => {
  it('names the Budget, shows its picture and sets it out in words', () => {
    at(`/shared?${FINISHED}`);
    const { budget, summary } = summaryOf(FINISHED);
    const words = summaryWords(summary);
    expect(screen.getByRole('heading', { level: 1, name: words.title })).toBeVisible();
    expect(document.title).toContain(words.title);
    // The picture its preview showed, which the words below say in full.
    const picture = document.querySelector('main img.share__picture');
    expect(picture).toHaveAttribute('src', `/api/card?${budget.query}`);
    expect(picture).toHaveAttribute('alt', '');
    // Every change, on its side.
    const side = (name: string) =>
      screen.getByRole('heading', { level: 3, name }).closest('section') as HTMLElement;
    for (const row of summary.tax)
      expect(within(side(SHARE_WORDS.tax)).getByText(row.words)).toBeVisible();
    for (const row of summary.spending) {
      expect(within(side(SHARE_WORDS.spending)).getByText(row.words)).toBeVisible();
    }
    expect(screen.getByText(words.rules)).toBeVisible();
    expect(
      screen.getByText(new RegExp(summary.headroomLine.replace(/[.()£]/g, '\\$&'))),
    ).toBeVisible();
    for (const r of summary.ratings) {
      expect(screen.getByText(`${r.title}:`).closest('li')).toHaveTextContent(String(r.rating));
    }
  });

  it('says so when a side moved nothing', () => {
    const search = `${BASE}&g=st.${FINAL_STAGE}&L=itbr.1`;
    at(`/shared?${search}`);
    expect(screen.getByText(SHARE_WORDS.noSpending)).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: SHARE_WORDS.untitled })).toBeVisible();
  });

  it('invites the reader to make their own, from the briefing, with one primary button', () => {
    at(`/shared?${FINISHED}`);
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    const play = screen.getByRole('link', { name: SHARE_TEXT.play });
    expect(play).toHaveClass('btn--primary');
    // A fresh game: the reader's own link carries none of the shared Budget's choices.
    const href = play.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/outlook\?/);
    expect(new URLSearchParams(href.split('?')[1]).get('L')).toBeNull();
    fireEvent.click(play);
    expect(screen.getByRole('heading', { level: 1, name: stageTitle('outlook') })).toBeVisible();
  });

  it('opens the Budget in the game, at Budget day', () => {
    at(`/shared?${FINISHED}`);
    const { budget } = summaryOf(FINISHED);
    const open = screen.getByRole('link', { name: SHARE_TEXT.open });
    expect(open).toHaveAttribute('href', `/budget-day?${budget.query}`);
    fireEvent.click(open);
    expect(screen.getByRole('heading', { level: 1, name: stageTitle('budget-day') })).toBeVisible();
    // The game took it up: Budget day shares the same Budget.
    expect(screen.getByRole('img', { name: /^What’s your Budget\? A Budget for/ })).toHaveAttribute(
      'src',
      `/api/card?${budget.query}`,
    );
  });

  it('leaves the reader’s own address alone: the link is someone else’s Budget', async () => {
    at(`/shared?${FINISHED}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(window.location.pathname).toBe('/shared');
    expect(window.location.search).toBe(`?${FINISHED}`);
  });

  it('says plainly when a link is not a finished Budget, and still invites the reader', () => {
    for (const search of ['', `${BASE}&g=st.3&L=moj.10`, 'nonsense']) {
      const view = at(`/shared?${search}`);
      expect(screen.getByRole('heading', { level: 1, name: SHARE_TEXT.missing })).toBeVisible();
      expect(screen.getByRole('link', { name: SHARE_TEXT.play })).toHaveClass('btn--primary');
      expect(document.querySelector('main img')).toBeNull();
      view.unmount();
    }
  });
});
