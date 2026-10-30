import type { BudgetMeasure } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_TEXT, countsWords } from '../board/words';
import { budget } from '../data';
import { BUDGET_TEXT } from './Budget';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';

type Reply = { status: number; body: unknown };
/** The server, as the page meets it: each request answered by `reply`. */
function serve(reply: (path: string, init?: RequestInit) => Reply) {
  const calls: { path: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      calls.push({ path: input, ...(init ? { init } : {}) });
      const answer = reply(input, init);
      return new Response(JSON.stringify(answer.body), { status: answer.status });
    }),
  );
  return calls;
}
const CLOSED: Reply = { status: 503, body: { error: 'closed' } };

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const movable = budget.measures.filter((m) => m.leverCode !== undefined);
const first = movable[0] as BudgetMeasure;
/**
 * A button's name: its words, then the measure a screen reader hears. The library may put a space
 * before the colon that the page does not, so the match allows one.
 */
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const named = (words: string, plain = '') =>
  new RegExp(`^${escaped(words)} ?: ${plain ? `${escaped(plain)}$` : ''}`);
const forOn = (plain: string) =>
  screen.getByRole('button', { name: named(BOARD_TEXT.measureFor, plain) });

describe('the Chancellor’s Budget (ADR-0045)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tells the story with every figure filled, the movable measures out and the rest folded', async () => {
    serve(() => CLOSED);
    at(`/?${BASE}`);
    const main = document.querySelector('main') as HTMLElement;
    // No placeholder is left unfilled anywhere on the page, and the story's figures are the
    // engine's: the headroom the Budget left is the one the bar starts from.
    expect(main.textContent).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(within(main).getAllByText(/£14\.5bn/).length).toBeGreaterThan(0);
    // Every measure a player can change is on the page, in one line, with the way to its screen;
    // the rest wait in one fold, closed.
    for (const m of movable) expect(within(main).getAllByText(m.plain).length, m.id).toBe(1);
    expect(screen.getAllByRole('button', { name: named(BUDGET_TEXT.change) })).toHaveLength(
      movable.length,
    );
    const fold = main.querySelector('details') as HTMLDetailsElement;
    expect(fold).not.toHaveAttribute('open');
    expect(within(fold).getByText(BUDGET_TEXT.rest)).toBeInTheDocument();
    expect(main.querySelectorAll('.btn--primary')).toHaveLength(1);
    // Voting waits on the database: one line says so, and there are no buttons to press.
    expect(await screen.findByText(BOARD_TEXT.votingClosed)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: named(BOARD_TEXT.measureFor) })).toBeNull();
  });

  it('votes on a measure once a device, and takes the vote back on a second press', async () => {
    const calls = serve((path, init) => {
      if (path === '/api/measures') {
        return { status: 200, body: { tallies: { [first.id]: { ups: 3, downs: 1 } } } };
      }
      if (path === `/api/measures/${first.id}/vote`) {
        const { value } = JSON.parse(String(init?.body)) as { value: number };
        return { status: 200, body: { ups: value === 1 ? 4 : 3, downs: 1, mine: value } };
      }
      return { status: 404, body: { error: 'missing' } };
    });
    at(`/?${BASE}`);
    expect(await screen.findByText(BOARD_TEXT.votingLead)).toBeInTheDocument();
    // Every measure, folded or not, has its two buttons; a measure nobody has voted on reads 0.
    expect(screen.getAllByRole('button', { name: named(BOARD_TEXT.measureFor) })).toHaveLength(
      budget.measures.length,
    );
    expect(screen.getAllByText(countsWords({ ups: 0, downs: 0 })).length).toBe(
      budget.measures.length - 1,
    );
    const row = screen.getByText(first.plain).closest('li') as HTMLElement;
    expect(within(row).getByText(countsWords({ ups: 3, downs: 1 }))).toBeInTheDocument();
    const forIt = forOn(first.plain);
    expect(forIt).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(forIt);
    await waitFor(() => expect(forIt).toHaveAttribute('aria-pressed', 'true'));
    expect(within(row).getByText(countsWords({ ups: 4, downs: 1 }))).toBeInTheDocument();
    // One write, carrying this browser's code and the vote, and nothing else.
    const sent = calls.filter((c) => c.path === `/api/measures/${first.id}/vote`);
    expect(sent).toHaveLength(1);
    const body = JSON.parse(String(sent[0]?.init?.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['value', 'voter']);
    expect(body.value).toBe(1);
    expect(body.voter).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    // The browser remembers it under the measure's own key, beside its leaderboard votes.
    expect(JSON.parse(window.localStorage.getItem('btc.voter.v1') ?? '{}')).toMatchObject({
      votes: { [`m:${first.id}`]: 1 },
    });
    // Pressed again, the vote goes, and the counts with it.
    fireEvent.click(forIt);
    await waitFor(() => expect(forIt).toHaveAttribute('aria-pressed', 'false'));
    expect(within(row).getByText(countsWords({ ups: 3, downs: 1 }))).toBeInTheDocument();
  });

  it('says when the network has cast too many, and keeps the vote unpressed', async () => {
    serve((path) =>
      path === '/api/measures'
        ? { status: 200, body: { tallies: {} } }
        : { status: 429, body: { error: 'limit' } },
    );
    at(`/?${BASE}`);
    await screen.findByText(BOARD_TEXT.votingLead);
    const forIt = forOn(first.plain);
    fireEvent.click(forIt);
    expect(await screen.findByText(BOARD_TEXT.voteLimited)).toBeInTheDocument();
    expect(forIt).toHaveAttribute('aria-pressed', 'false');
  });

  it('says so when the votes cannot be reached', async () => {
    serve(() => ({ status: 503, body: { error: 'down' } }));
    at(`/?${BASE}`);
    expect(await screen.findByText(BOARD_TEXT.votingDown)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: named(BOARD_TEXT.measureFor) })).toBeNull();
  });
});
