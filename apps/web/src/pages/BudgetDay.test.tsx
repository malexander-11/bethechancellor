import { SHARE_WORDS, readFinishedBudget } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_TEXT, TITLE_MAX, TITLE_REFUSED } from '../board/words';
import { gameData } from '../data';
import { SHARE_TEXT } from '../share/words';

function at(search: string) {
  // The provider reads the budget out of the real location, so set it before rendering.
  window.history.replaceState(null, '', `/budget-day?${search}`);
  return render(
    <MemoryRouter initialEntries={[`/budget-day?${search}`]}>
      <App />
    </MemoryRouter>,
  );
}

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const card = (name: string) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;
const meter = (name: string) => within(card(name)).getByRole('img');

/** Two priorities agreed, delivered from the review, on today's estimate (Phase 24). */
const GAME = 'g=st.4_pr.defence+safer-streets&M=rate.0.75_rpi.0.5';
/**
 * A game delivered with nothing agreed and nothing changed. Budget day needs a game (Phase 26):
 * the sandbox that once opened it with none has gone.
 */
const EMPTY = 'g=st.4&M=rate.0.75_rpi.0.5';

describe('Budget day: what your Budget means', () => {
  it('is one screen: the rules line, three rated audiences and five households', () => {
    at(`${BASE}&${EMPTY}`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What your Budget means' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    // The rules by their plain names; the welfare cap only when it is missed (Phase 25).
    expect(screen.getByText('You meet both fiscal rules on these numbers.')).toBeInTheDocument();
    for (const title of ['Labour backbenchers', 'The markets', 'The public']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // An empty Budget: the benches and the public shrug; the markets find today's £6.8bn thin,
    // and say the economy since March took it, not the player's measures (Phase 25).
    expect(meter('Labour backbenchers')).toHaveAccessibleName('3 of 5: Divided');
    expect(meter('The public')).toHaveAccessibleName('3 of 5: Shrugging');
    expect(meter('The markets')).toHaveAccessibleName('2 of 5: Nervous');
    expect(within(card('The markets')).getByText(/not your measures/)).toBeInTheDocument();
    // Each card is its rating and its one reason: no "Why this rating" (ADR-0043).
    expect(screen.queryByText(/^Why this rating/)).toBeNull();
    // The five households are on the page, behind no fold; no speech and no documents (ADR-0043).
    expect(
      screen.getByRole('heading', { level: 2, name: 'Who feels it: five households' }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('main .household')).toHaveLength(5);
    expect(document.querySelector('main details')).toBeNull();
    expect(screen.queryByText('Read the speech')).toBeNull();
    expect(screen.queryByText('Budget documents')).toBeNull();
    // No Budget in three sentences, and no close (ADR-0043); "change something" means the review.
    expect(screen.queryByText(/in three sentences/)).toBeNull();
    expect(screen.queryByText('How your Budget went')).toBeNull();
    expect(screen.queryByText('Priorities, promises and who paid')).toBeNull();
    expect(screen.getByRole('link', { name: 'Change something' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/review\?/),
    );
  });

  it('gives the reason and the decisions behind it', () => {
    // Health, schools and prisons all up a tenth: about £35bn a year against £6.8bn of headroom.
    at(`${BASE}&${EMPTY}&L=dhsc.10_dfe.10_moj.10`);
    const markets = card('The markets');
    expect(meter('The markets')).toHaveAccessibleName('1 of 5: Alarmed');
    expect(within(markets).getByText(/The day-to-day rule is missed/)).toBeInTheDocument();
    expect(within(markets).getByText(/Because of the health budget/)).toBeInTheDocument();
    expect(
      screen.getByText(/^Missed on these numbers: the day-to-day rule by £\d+\.\dbn/),
    ).toBeInTheDocument();
  });

  it('pins the public at Furious when a manifesto red line is crossed', () => {
    at(`${BASE}&${GAME}&L=moj.10_itbr.1`);
    expect(meter('The public')).toHaveAccessibleName('1 of 5: Furious');
    // Each audience gives its strongest reason, with the decisions behind it.
    expect(
      within(card('The public')).getByText(/A manifesto promise has been broken/),
    ).toBeInTheDocument();
    expect(
      within(card('The public')).getByText(
        /Because of the tax lock \(the basic rate of income tax\)/,
      ),
    ).toBeInTheDocument();
    // The one reason agrees with the rating; the other side is one short line (Phase 25).
    expect(within(card('The public')).getByText('Counted for: Priorities delivered')).toBeVisible();
    const couple = screen.getByText(/A couple on median earnings/).closest('li') as HTMLElement;
    expect(within(couple).getByText(/A penny on the basic rate/)).toBeInTheDocument();
    expect(within(couple).getByText('worse off')).toBeInTheDocument();
  });

  it('marks employer National Insurance amber: the public is not pinned at the floor, and the strain is a reason', () => {
    at(`${BASE}&${GAME}&L=moj.10_nicer.1`);
    // The floor is for the manifesto's own words. What employer National Insurance costs with the
    // public, and with the benches, is its strain, named as each card's reason.
    expect(meter('The public')).not.toHaveAccessibleName(/^1 of 5/);
    expect(
      within(card('The public')).getByText(/kept in the words and tested in the spirit/),
    ).toBeInTheDocument();
    expect(
      within(card('Labour backbenchers')).getByText(/keeps the letter of the manifesto/),
    ).toBeInTheDocument();
  });

  it('approves of a priority carried through, and says nothing of what the money buys (ADR-0043)', () => {
    at(`${BASE}&${GAME.replace('pr.defence+safer-streets', 'pr.safer-streets')}&L=moj.10`);
    expect(meter('The public')).toHaveAccessibleName('4 of 5: Approving');
    expect(
      within(card('The public')).getByText(/One of the Budget’s priorities is delivered in full/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/A family on universal credit/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/What the money does and does not buy/)).toBeNull();
    expect(screen.queryByText(/Prison places take years to build/)).toBeNull();
  });

  it('arrives as the end of the game: the link it shares opens as a finished Budget', async () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    expect(screen.queryByRole('link', { name: 'the one you opened' })).toBeNull();
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('g')).toMatch(/st\.5/),
    );
  });

  it('offers the ways on: share it, change something at the review, or start again (ADR-0044)', () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    // Sharing is the one primary; copying a bare link went with it.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    expect(screen.getByRole('button', { name: SHARE_TEXT.share })).toHaveClass('btn--primary');
    expect(screen.queryByRole('button', { name: 'Copy a link to this Budget' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Change something' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/review\?/),
    );
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });

  it('never calls a household untouched when something in its groups moved (Phase 25)', () => {
    at(`${BASE}&${GAME}&L=dip47.1_moj.10_wealth2.1`);
    const professional = screen
      .getByText('A higher-rate professional with savings')
      .closest('.household') as HTMLElement;
    expect(within(professional).getByText('nothing by name')).toBeInTheDocument();
    expect(
      within(professional).getByText('“Nothing aimed at us by name that we could see.”'),
    ).toBeInTheDocument();
  });
});

describe('Budget day: sharing the Budget (ADR-0044)', () => {
  /** Give the test's browser a share sheet or a clipboard, as a phone or a desktop has. */
  function stub(name: 'share' | 'clipboard', value: unknown) {
    Object.defineProperty(navigator, name, { value, configurable: true });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  /** The picture, said in words: its alternative text starts with the game's name. */
  const picture = () =>
    screen.getByRole('img', { name: new RegExp(`^${SHARE_WORDS.game.replace('?', '\\?')} `) });
  /** The finished Budget the picture is of, as its address names it. */
  function pictured() {
    const src = picture().getAttribute('src') ?? '';
    expect(src).toMatch(/^\/api\/card\?/);
    const query = src.slice(src.indexOf('?') + 1);
    const budget = readFinishedBudget(gameData, query);
    if (!budget) throw new Error(`the picture is not of a finished Budget: ${src}`);
    // Written as every link to it is, so every share of it is one picture.
    expect(budget.query).toBe(query);
    return budget;
  }
  const sharedPage = (query: string) => `${window.location.origin}/shared?${query}`;

  it('shows the Budget as the picture its link previews, and saves it on request', () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    expect(screen.getByRole('heading', { level: 2, name: SHARE_TEXT.heading })).toBeVisible();
    const budget = pictured();
    expect(budget.leverValues).toMatchObject({ moj: 10 });
    expect(budget.game.priorities).toEqual(['defence', 'safer-streets']);
    expect(picture().getAttribute('alt')).toContain('Prisons and courts');
    const save = screen.getByRole('link', { name: SHARE_TEXT.download });
    expect(save).toHaveAttribute('href', `${picture().getAttribute('src')}&download=1`);
    expect(save).toHaveAttribute('download');
  });

  it('shares the shared page’s link through the device’s own sheet, with its words', async () => {
    const share = vi.fn(async () => {});
    stub('share', share);
    at(`${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('button', { name: SHARE_TEXT.share }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sent = share.mock.calls[0] as unknown as [ShareData];
    expect(sent[0].url).toBe(sharedPage(pictured().query));
    expect(sent[0].title).toBe('A Budget for defence and safer streets');
    expect(sent[0].text).toMatch(/^I made a Budget for defence and safer streets\. .+\?$/);
  });

  it('copies the link where the device cannot share, and says so', async () => {
    const writeText = vi.fn(async () => {});
    stub('clipboard', { writeText });
    at(`${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('button', { name: SHARE_TEXT.share }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(sharedPage(pictured().query)));
    expect(await screen.findByRole('status')).toHaveTextContent(SHARE_TEXT.copied);
  });

  it('copies the link on its own button, even where the device could share it', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    stub('share', share);
    stub('clipboard', { writeText });
    at(`${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('button', { name: SHARE_TEXT.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(sharedPage(pictured().query)));
    expect(share).not.toHaveBeenCalled();
  });

  it('says nothing more when the player closes the share sheet', async () => {
    const writeText = vi.fn(async () => {});
    stub(
      'share',
      vi.fn(async () => Promise.reject(new DOMException('closed', 'AbortError'))),
    );
    stub('clipboard', { writeText });
    at(`${BASE}&${GAME}&L=moj.10`);
    fireEvent.click(screen.getByRole('button', { name: SHARE_TEXT.share }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('posts the link on each network’s own page, opened beside the game and saying so', () => {
    at(`${BASE}&${GAME}&L=moj.10`);
    const page = sharedPage(pictured().query);
    const list = screen.getByRole('list', { name: SHARE_TEXT.networks });
    const links = within(list).getAllByRole('link');
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href, link.textContent ?? '').toContain(encodeURIComponent(page));
      if (href.startsWith('mailto:')) continue;
      expect(new URL(href).protocol).toBe('https:');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAccessibleName(expect.stringContaining(SHARE_TEXT.newTab));
    }
  });
});

describe('Budget day: onto the leaderboard (ADR-0044)', () => {
  afterEach(() => vi.unstubAllGlobals());

  type Post = (body: { query: string; title: string }) => { status: number; body: unknown };
  /** The server, open or not, and what it answers a post. */
  function serve(open: boolean, post?: Post) {
    const calls: { path: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        calls.push({ path: input, ...(init ? { init } : {}) });
        if (input === '/api/health') {
          return new Response(JSON.stringify({ ok: true, db: open ? 'ok' : 'none' }));
        }
        if (input === '/api/budgets' && init?.method === 'POST' && post) {
          const answer = post(JSON.parse(String(init.body)) as { query: string; title: string });
          return new Response(JSON.stringify(answer.body), { status: answer.status });
        }
        return new Response('{}', { status: 404 });
      }),
    );
    return calls;
  }
  const entry = (title: string, query: string) => ({
    id: 'abcd1234',
    title,
    query,
    ups: 0,
    downs: 0,
    score: 0,
    createdAt: '2026-10-01T12:00:00.000Z',
  });
  const titled = async (title: string) => {
    const field = await screen.findByLabelText(BOARD_TEXT.postLabel);
    fireEvent.change(field, { target: { value: title } });
    fireEvent.click(screen.getByRole('button', { name: BOARD_TEXT.postButton }));
    return field;
  };

  it('offers no way onto the leaderboard while it is not open', async () => {
    const calls = serve(false);
    at(`${BASE}&${GAME}&L=moj.10`);
    await waitFor(() => expect(calls.some((c) => c.path === '/api/health')).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByLabelText(BOARD_TEXT.postLabel)).toBeNull();
    expect(screen.queryByRole('heading', { name: BOARD_TEXT.postHeading })).toBeNull();
  });

  it('puts the Budget it shares on the leaderboard under a title, and links to the entry', async () => {
    const calls = serve(true, (body) => ({
      status: 201,
      body: { entry: entry(body.title, body.query), created: true },
    }));
    at(`${BASE}&${GAME}&L=moj.10`);
    const field = await screen.findByLabelText(BOARD_TEXT.postLabel);
    expect(field).toHaveAttribute('maxlength', String(TITLE_MAX));
    expect(field).toHaveAccessibleDescription(expect.stringContaining(BOARD_TEXT.postHint));
    await titled('Safe and sound');
    expect(await screen.findByText(BOARD_TEXT.posted)).toBeVisible();
    expect(screen.getByRole('link', { name: BOARD_TEXT.seeEntry })).toHaveAttribute(
      'href',
      '/leaderboard/abcd1234',
    );
    expect(screen.queryByLabelText(BOARD_TEXT.postLabel)).toBeNull();
    const sent = JSON.parse(String(calls.find((c) => c.init?.method === 'POST')?.init?.body)) as {
      query: string;
      title: string;
    };
    expect(sent.title).toBe('Safe and sound');
    // The Budget posted is the one the picture shows.
    const picture = screen.getByRole('img', { name: /^What’s your Budget\? / });
    expect(`/api/card?${sent.query}`).toBe(picture.getAttribute('src'));
  });

  it('says why a title is refused, marks the field and puts the player back in it', async () => {
    serve(true, () => ({ status: 422, body: { error: 'title', reason: 'swearing' } }));
    at(`${BASE}&${GAME}&L=moj.10`);
    const field = await titled('Something rude');
    expect(await screen.findByText(TITLE_REFUSED.swearing ?? '')).toBeVisible();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining(TITLE_REFUSED.swearing ?? ''),
    );
  });

  it('finds the entry already there for a Budget posted before', async () => {
    serve(true, (body) => ({
      status: 200,
      body: { entry: entry('Posted first', body.query), created: false },
    }));
    at(`${BASE}&${GAME}&L=moj.10`);
    await titled('Posted second');
    expect(
      await screen.findByText(BOARD_TEXT.already.replace('{title}', 'Posted first')),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: BOARD_TEXT.seeEntry })).toBeVisible();
  });

  it('says so when the leaderboard cannot take it', async () => {
    for (const [answer, said] of [
      [{ status: 429, body: { error: 'limit' } }, BOARD_TEXT.postLimited],
      [{ status: 409, body: { error: 'hidden' } }, BOARD_TEXT.takenDown],
      [{ status: 503, body: { error: 'down' } }, BOARD_TEXT.down],
    ] as const) {
      serve(true, () => answer);
      const view = at(`${BASE}&${GAME}&L=moj.10`);
      const field = await titled('A title');
      expect(await screen.findByText(said)).toBeVisible();
      expect(field).not.toHaveAttribute('aria-invalid');
      view.unmount();
      vi.unstubAllGlobals();
    }
  });
});
