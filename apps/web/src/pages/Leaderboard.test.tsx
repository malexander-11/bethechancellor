import {
  FINAL_STAGE,
  readFinishedBudget,
  summariseBudget,
  gameOutcomeOf,
  summaryWords,
} from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import type { Entry } from '../board/api';
import { BOARD_TEXT, countsWords } from '../board/words';
import { gameData, guide } from '../data';
import { SHARE_TEXT } from '../share/words';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const finished = (rest: string) => {
  const budget = readFinishedBudget(gameData, `${BASE}&g=st.${FINAL_STAGE}_${rest}`);
  if (!budget) throw new Error('not a finished Budget');
  return budget.query;
};
const ENTRIES: Entry[] = [
  {
    id: 'abcd1234',
    title: 'Safe streets, sound money',
    query: finished('pr.safer-streets&L=moj.10_itbr.1'),
    ups: 3,
    downs: 1,
    score: 2,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'efgh5678',
    title: 'Defence first',
    query: finished('pr.defence&L=dip47.1'),
    ups: 1,
    downs: 0,
    score: 1,
    createdAt: '2026-10-01T11:00:00.000Z',
  },
];
const first = ENTRIES[0] as Entry;

type Reply = { status: number; body: unknown } | 'offline';
/** The leaderboard's server, as the page meets it: each request answered by `reply`. */
function serve(reply: (path: string, init?: RequestInit) => Reply) {
  const calls: { path: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      calls.push({ path: input, ...(init ? { init } : {}) });
      const answer = reply(input, init);
      if (answer === 'offline') throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(answer.body), { status: answer.status });
    }),
  );
  return calls;
}
const listing = (entries: Entry[], more = false): Reply => ({
  status: 200,
  body: { entries, more },
});

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => window.localStorage.removeItem('btc.voter.v1'));
afterEach(() => vi.unstubAllGlobals());

const entryItem = (title: string) =>
  screen.getByRole('heading', { level: 2, name: title }).closest('li') as HTMLElement;

describe('the leaderboard (ADR-0044)', () => {
  it('lists Budgets by votes, each under its title, with its theme, its verdict and its votes', async () => {
    const calls = serve(() => listing(ENTRIES));
    at('/leaderboard');
    expect(await screen.findByRole('heading', { level: 2, name: first.title })).toBeVisible();
    expect(calls[0]?.path).toBe('/api/budgets?sort=top&offset=0');
    expect(screen.getByRole('heading', { level: 1, name: BOARD_TEXT.title })).toBeVisible();
    expect(screen.getByRole('link', { name: BOARD_TEXT.top })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const item = entryItem(first.title);
    expect(within(item).getByRole('link', { name: first.title })).toHaveAttribute(
      'href',
      `/leaderboard/${first.id}`,
    );
    const summary = summariseBudget(
      gameData,
      readFinishedBudget(gameData, first.query) ?? (null as never),
      gameOutcomeOf(gameData),
    );
    expect(within(item).getByText(summaryWords(summary).title)).toBeVisible();
    expect(within(item).getByText(new RegExp(summaryWords(summary).rules))).toBeVisible();
    expect(within(item).getByText(countsWords(first))).toBeVisible();
    expect(within(item).getByRole('button', { name: /^▲? ?Vote for/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // Reading it makes no device code: only a vote or a report does.
    expect(window.localStorage.getItem('btc.voter.v1')).toBeNull();
    expect(calls.every((c) => c.init?.method === undefined)).toBe(true);
  });

  it('orders by newest on the other link', async () => {
    const calls = serve(() => listing(ENTRIES));
    at('/leaderboard');
    await screen.findByRole('heading', { level: 2, name: first.title });
    fireEvent.click(screen.getByRole('link', { name: BOARD_TEXT.newest }));
    await waitFor(() => expect(calls.at(-1)?.path).toBe('/api/budgets?sort=new&offset=0'));
    expect(screen.getByRole('link', { name: BOARD_TEXT.newest })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('says plainly when it is not open yet, cannot be reached, or is empty', async () => {
    for (const [reply, said] of [
      [{ status: 503, body: { error: 'closed' } }, BOARD_TEXT.closed],
      ['offline', BOARD_TEXT.down],
      [{ status: 503, body: { error: 'down' } }, BOARD_TEXT.down],
      [listing([]), BOARD_TEXT.empty],
    ] as const) {
      serve(() => reply);
      const view = at('/leaderboard');
      expect(await screen.findByText(said)).toBeVisible();
      // The way on is there whatever the leaderboard says.
      expect(screen.getByRole('link', { name: SHARE_TEXT.play })).toHaveClass('btn--primary');
      view.unmount();
      vi.unstubAllGlobals();
    }
  });

  it('shows more on request', async () => {
    const calls = serve((path) =>
      path.endsWith('offset=0') ? listing([first], true) : listing([ENTRIES[1] as Entry]),
    );
    at('/leaderboard');
    await screen.findByRole('heading', { level: 2, name: first.title });
    fireEvent.click(screen.getByRole('button', { name: BOARD_TEXT.more }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Defence first' })).toBeVisible();
    expect(calls.at(-1)?.path).toBe('/api/budgets?sort=top&offset=1');
    expect(screen.queryByRole('button', { name: BOARD_TEXT.more })).toBeNull();
  });

  it('counts one vote this browser can change or take back, and keeps its code only then', async () => {
    let ups = first.ups;
    const calls = serve((path, init) => {
      if (!init) return listing(ENTRIES);
      const { value } = JSON.parse(String(init.body)) as { value: number };
      ups = first.ups + (value === 1 ? 1 : 0);
      return { status: 200, body: { ups, downs: first.downs, score: ups - first.downs } };
    });
    at('/leaderboard');
    await screen.findByRole('heading', { level: 2, name: first.title });
    const item = entryItem(first.title);
    const voteFor = within(item).getByRole('button', { name: /Vote for/ });
    fireEvent.click(voteFor);
    await waitFor(() => expect(voteFor).toHaveAttribute('aria-pressed', 'true'));
    expect(
      within(item).getByText(countsWords({ ups: first.ups + 1, downs: first.downs })),
    ).toBeVisible();
    const sent = calls.find((c) => c.init?.method === 'POST');
    expect(sent?.path).toBe(`/api/budgets/${first.id}/vote`);
    const body = JSON.parse(String(sent?.init?.body)) as { voter: string; value: number };
    expect(body.value).toBe(1);
    expect(body.voter).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(JSON.parse(window.localStorage.getItem('btc.voter.v1') ?? '{}')).toMatchObject({
      code: body.voter,
      votes: { [first.id]: 1 },
    });
    // Pressed again, the vote is taken back.
    fireEvent.click(voteFor);
    await waitFor(() => expect(voteFor).toHaveAttribute('aria-pressed', 'false'));
    expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({ voter: body.voter, value: 0 });
  });

  it('says so when a vote cannot be counted', async () => {
    serve((_path, init) => (init ? { status: 429, body: { error: 'limit' } } : listing(ENTRIES)));
    at('/leaderboard');
    await screen.findByRole('heading', { level: 2, name: first.title });
    const item = entryItem(first.title);
    fireEvent.click(within(item).getByRole('button', { name: /Vote against/ }));
    expect(await within(item).findByText(BOARD_TEXT.voteLimited)).toBeVisible();
    expect(within(item).getByRole('button', { name: /Vote against/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports a title once, and thanks the reporter', async () => {
    const calls = serve((_path, init) =>
      init ? { status: 200, body: { reported: true } } : listing(ENTRIES),
    );
    at('/leaderboard');
    await screen.findByRole('heading', { level: 2, name: first.title });
    const item = entryItem(first.title);
    fireEvent.click(within(item).getByRole('button', { name: new RegExp(BOARD_TEXT.report) }));
    expect(await within(item).findByText(BOARD_TEXT.reportThanks)).toBeVisible();
    expect(
      within(item).getByRole('button', { name: new RegExp(BOARD_TEXT.reported) }),
    ).toBeDisabled();
    expect(calls.at(-1)?.path).toBe(`/api/budgets/${first.id}/report`);
  });

  it('leads back to the player’s own game where it stands', async () => {
    serve(() => listing(ENTRIES));
    at(`/review?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5&L=moj.10`);
    fireEvent.click(screen.getByRole('link', { name: BOARD_TEXT.footer }));
    await screen.findByRole('heading', { level: 2, name: first.title });
    expect(screen.getByRole('link', { name: BOARD_TEXT.back })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/review\?.*L=moj\.10/),
    );
    expect(screen.queryByRole('link', { name: SHARE_TEXT.play })).toBeNull();
  });
});

describe('an entry’s page (ADR-0044)', () => {
  const stageTitle = (step: string) => guide.stages.find((s) => s.step === step)?.title ?? '';

  it('shows the player’s title, the Budget’s theme and picture, its votes, and the Budget in words', async () => {
    const calls = serve(() => ({ status: 200, body: { entry: first } }));
    at(`/leaderboard/${first.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: first.title })).toBeVisible();
    expect(calls[0]?.path).toBe(`/api/budgets/${first.id}`);
    expect(document.title).toContain(first.title);
    expect(document.querySelector('main img.share__picture')).toHaveAttribute(
      'src',
      `/api/card?${first.query}`,
    );
    expect(screen.getByText(countsWords(first))).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: SHARE_TEXT.sides })).toBeVisible();
    expect(screen.getByRole('link', { name: BOARD_TEXT.see })).toHaveAttribute(
      'href',
      '/leaderboard',
    );
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
  });

  it('opens the Budget in the game, at Budget day', async () => {
    serve(() => ({ status: 200, body: { entry: first } }));
    at(`/leaderboard/${first.id}`);
    fireEvent.click(await screen.findByRole('link', { name: SHARE_TEXT.open }));
    expect(screen.getByRole('heading', { level: 1, name: stageTitle('budget-day') })).toBeVisible();
  });

  it('says plainly when the entry is not there, or the leaderboard is closed', async () => {
    for (const [reply, heading, said] of [
      [{ status: 404, body: { error: 'missing' } }, BOARD_TEXT.missing, BOARD_TEXT.missingLead],
      [{ status: 503, body: { error: 'closed' } }, BOARD_TEXT.title, BOARD_TEXT.closed],
    ] as const) {
      serve(() => reply);
      const view = at(`/leaderboard/${first.id}`);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible();
      expect(screen.getByText(said)).toBeVisible();
      expect(screen.getByRole('link', { name: SHARE_TEXT.play })).toHaveClass('btn--primary');
      view.unmount();
      vi.unstubAllGlobals();
    }
  });
});
