import { cardMeasures, linesFigure, restMeasures } from '@btc/engine';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { BOARD_TEXT } from '../board/words';
import { CARD_TEXT, INVESTMENT_WORDS } from '../components/MeasureCard';
import { budget, scorecard } from '../data';
import { MEASURES_TEXT } from './Measures';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** A game just begun, on the walk. */
const GAME = 'g=st.0_rd.3';

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
const h1 = (name: string) => screen.getByRole('heading', { level: 1, name });
const search = () => new URLSearchParams(window.location.search);
/** A card on the page, by its heading. */
const cardNamed = (title: string) =>
  screen.getByRole('heading', { level: 2, name: title }).closest('li') as HTMLElement;
const stored = () =>
  JSON.parse(window.localStorage.getItem('btc.voter.v1') ?? '{}') as {
    votes?: Record<string, number>;
  };
const themeOf = (lever: string) =>
  budget.themes.find((t) => t.cards.some((c) => c.lever === lever));
const card = (lever: string) => {
  const found = themeOf(lever)?.cards.find((c) => c.lever === lever);
  if (!found) throw new Error(`no card for ${lever}`);
  return found;
};

describe('step 1: the Chancellor’s measures (ADR-0046)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks about every measure a player can reverse once, a theme a page', () => {
    serve(() => CLOSED);
    const seen: string[] = [];
    for (const theme of budget.themes) {
      const view = at(`/measures/${theme.id}?${BASE}&${GAME}`);
      expect(h1(theme.title)).toBeInTheDocument();
      expect(screen.getByText(theme.lead)).toBeInTheDocument();
      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(headings, theme.id).toEqual(theme.cards.map((c) => c.title));
      seen.push(...theme.cards.map((c) => c.lever));
      expect(document.querySelectorAll('main .btn--primary'), theme.id).toHaveLength(1);
      view.unmount();
    }
    const reversible = new Set(budget.measures.flatMap((m) => (m.leverCode ? [m.leverCode] : [])));
    expect(new Set(seen)).toEqual(reversible);
    expect(seen).toHaveLength(reversible.size);
  });

  it('shows what was done and the Treasury’s figure, and the rest under See more (ADR-0048)', () => {
    serve(() => CLOSED);
    const savings = card('b6save');
    at(`/measures/${themeOf('b6save')?.id}?${BASE}&${GAME}`);
    const el = cardNamed(savings.title);
    // The face: the heading and the Treasury's own figure for the card's lines.
    const lines = cardMeasures(budget, savings).map((m) => m.line);
    const figure = linesFigure(scorecard, lines, '2029-30');
    expect(figure?.words).toMatch(/^raises £\d\.\dbn in 2029-30$/);
    expect(el.querySelector('.mcard__figure')?.textContent).toBe(
      `R${figure?.words.slice(1) ?? ''}`,
    );
    // See more, closed until opened: what it means, what removing it does to your money, and the
    // line of the Budget's table it comes from.
    const more = within(el).getByText(CARD_TEXT.more).closest('details') as HTMLElement;
    expect(more).not.toHaveAttribute('open');
    expect(within(more).getByText(savings.explain)).toBeInTheDocument();
    expect(
      within(more).getByText(`Source: ${budget.title}, Table 6.1, line ${lines[0]}.`),
    ).toBeInTheDocument();
    // What removing it costs is the engine's, as the bar will say it: the Treasury's line with the
    // interest on what it no longer raises on top, and never less.
    const line = within(more).getByText(/^Removing it costs you £\d\.\dbn, with the interest\.$/);
    const said = Number(/£(\d\.\d)bn/.exec(line.textContent ?? '')?.[1]) * 1000;
    const treasury = figure?.gbpm ?? 0;
    expect(treasury).toBeGreaterThan(0);
    expect(said).toBeGreaterThanOrEqual(treasury - 50);
    expect(said).toBeLessThanOrEqual(treasury * 1.5 + 50);
  });

  it('says what removing saves, and that investment moves the money only by its interest', () => {
    serve(() => CLOSED);
    at(`/measures/${themeOf('b6homes')?.id}?${BASE}&${GAME}`);
    const homes = cardNamed(card('b6homes').title);
    expect(within(homes).getByText(new RegExp(INVESTMENT_WORDS.slice(0, 20)))).toBeInTheDocument();
    const growth = cardNamed(card('b6grow').title);
    expect(
      within(growth).getByText(/^Removing it saves you £\d\.\dbn, with the interest\.$/),
    ).toBeInTheDocument();
  });

  it('takes a measure out of your Budget when you disagree, and puts it back on a second press', async () => {
    serve(() => CLOSED);
    at(`/measures/${themeOf('b6save')?.id}?${BASE}&${GAME}`);
    const el = cardNamed(card('b6save').title);
    const disagree = within(el).getByRole('button', { name: CARD_TEXT.remove });
    const agree = within(el).getByRole('button', { name: CARD_TEXT.approve });
    expect(disagree).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(disagree);
    await waitFor(() => expect(search().get('L')).toMatch(/b6save\.1/));
    expect(disagree).toHaveAttribute('aria-pressed', 'true');
    expect(agree).toHaveAttribute('aria-pressed', 'false');
    // The card takes the answer's colour, as well as its pressed button (ADR-0047).
    expect(el).toHaveClass('mcard--disagreed');
    // The bar keeps the money: what disagreeing gave up is now to find.
    const bar = screen.getByRole('region', { name: 'Your Budget so far' });
    expect(bar.querySelector('.bar__money')?.textContent).toMatch(
      /^Your money, 2029-30£0\.\dbn to find$/,
    );
    // The answer is this browser's vote against, remembered whether or not voting is open.
    expect(stored().votes).toMatchObject({ 'm:m62': -1 });
    fireEvent.click(disagree);
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/b6save/));
    expect(disagree).toHaveAttribute('aria-pressed', 'false');
    expect(stored().votes?.['m:m62']).toBeUndefined();
    expect(bar.querySelector('.bar__money')?.textContent).toMatch(/nothing to spend or find$/);
  });

  it('keeps a measure when you agree, as your vote, and takes the vote back on a second press', async () => {
    serve(() => CLOSED);
    at(`/measures/${themeOf('b6save')?.id}?${BASE}&${GAME}&L=b6save.1`);
    const el = cardNamed(card('b6save').title);
    const agree = within(el).getByRole('button', { name: CARD_TEXT.approve });
    // Agreeing after disagreeing puts the measure back in.
    fireEvent.click(agree);
    expect(agree).toHaveAttribute('aria-pressed', 'true');
    expect(el).toHaveClass('mcard--agreed');
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/b6save/));
    expect(stored().votes).toMatchObject({ 'm:m62': 1 });
    fireEvent.click(agree);
    expect(agree).toHaveAttribute('aria-pressed', 'false');
    expect(stored().votes?.['m:m62']).toBeUndefined();
  });

  it('counts an answer as a vote on every measure a card stands for, once voting is open', async () => {
    const reliefs = card('b6brr');
    const ids = cardMeasures(budget, reliefs).map((m) => m.id);
    const firstId = ids[0] ?? '';
    const calls = serve((path, init) => {
      if (path === '/api/measures') {
        return { status: 200, body: { tallies: { [firstId]: { ups: 3, downs: 1 } } } };
      }
      if (path.endsWith('/vote')) {
        const { value } = JSON.parse(String(init?.body)) as { value: number };
        return { status: 200, body: { ups: 3, downs: value === -1 ? 2 : 1, mine: value } };
      }
      return { status: 404, body: { error: 'missing' } };
    });
    at(`/measures/${themeOf('b6brr')?.id}?${BASE}&${GAME}`);
    expect(await screen.findByText(BOARD_TEXT.votingLead)).toBeInTheDocument();
    const el = cardNamed(reliefs.title);
    // What everyone said shows once the player has said it too (ADR-0047).
    expect(within(el).queryByText('3 agree, 1 disagree')).toBeNull();
    fireEvent.click(within(el).getByRole('button', { name: CARD_TEXT.remove }));
    await waitFor(() =>
      expect(calls.filter((c) => c.path.endsWith('/vote'))).toHaveLength(ids.length),
    );
    const sent = calls.filter((c) => c.path.endsWith('/vote'));
    expect(sent.map((c) => c.path)).toEqual(ids.map((id) => `/api/measures/${id}/vote`));
    for (const c of sent) {
      const body = JSON.parse(String(c.init?.body)) as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['value', 'voter']);
      expect(body.value).toBe(-1);
    }
    expect(await within(el).findByText('3 agree, 2 disagree')).toBeInTheDocument();
  });

  it('says voting is not open yet and sends no vote without a database, the answer still counting', async () => {
    const calls = serve(() => CLOSED);
    at(`/measures/${budget.themes[0]?.id}?${BASE}&${GAME}`);
    expect(await screen.findByText(BOARD_TEXT.votingClosed)).toBeInTheDocument();
    const first = budget.themes[0]?.cards[0];
    const el = cardNamed(first?.title ?? '');
    fireEvent.click(within(el).getByRole('button', { name: CARD_TEXT.remove }));
    await waitFor(() => expect(search().get('L')).toMatch(new RegExp(`${first?.lever}\\.1`)));
    expect(calls.filter((c) => c.path.endsWith('/vote'))).toHaveLength(0);
  });

  it('leads from theme to theme, the Budget carried, and back to the landing page from the first', () => {
    serve(() => CLOSED);
    const [first, second] = budget.themes;
    at(`/measures/${first?.id}?${BASE}&${GAME}&L=b6save.1`);
    expect(screen.getByRole('link', { name: MEASURES_TEXT.back })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/\?/),
    );
    fireEvent.click(screen.getByRole('link', { name: `Next: ${second?.title.toLowerCase()}` }));
    expect(h1(second?.title ?? '')).toBeInTheDocument();
    expect(search().get('L')).toMatch(/b6save\.1/);
    expect(screen.getByRole('link', { name: MEASURES_TEXT.back })).toHaveAttribute(
      'href',
      expect.stringMatching(new RegExp(`^/measures/${first?.id}\\?`)),
    );
  });

  it('ends on the small print: grouped rows, a tick or a cross each voting on every measure in it, then the balance', async () => {
    serve(() => CLOSED);
    at(`/measures/other?${BASE}&${GAME}`);
    expect(h1(MEASURES_TEXT.smallTitle)).toBeInTheDocument();
    expect(screen.getByText(MEASURES_TEXT.smallLead)).toBeInTheDocument();
    // A row a group, as the Budget file lists them, no more than twenty (ADR-0049).
    const rows = document.querySelectorAll('.small__row');
    expect(rows).toHaveLength(budget.rest.length);
    expect(rows.length).toBeLessThanOrEqual(20);
    // Each row's See more says each of its measures in its own words, and where they come from.
    const first = budget.rest[0];
    const measures = restMeasures(budget, first ?? { measures: [] });
    const row = rows[0] as HTMLElement;
    const more = within(row).getByText(CARD_TEXT.more).closest('details') as HTMLElement;
    expect(more).not.toHaveAttribute('open');
    for (const m of measures) expect(within(more).getByText(m.plain)).toBeInTheDocument();
    expect(more.querySelector('.mcard__source')?.textContent).toMatch(
      /^Source: .*, Table 6\.1, lines? /,
    );
    // The tick is a vote for each measure in the row.
    const tick = screen.getByRole('button', { name: `${BOARD_TEXT.agree}: ${first?.title}` });
    fireEvent.click(tick);
    expect(tick).toHaveAttribute('aria-pressed', 'true');
    for (const m of measures) expect(stored().votes).toMatchObject({ [`m:${m.id}`]: 1 });
    // A vote moves no money: nothing goes into the link.
    expect(search().get('L')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: MEASURES_TEXT.toBalance }));
    expect(h1('Balance your Budget')).toBeInTheDocument();
    await waitFor(() => expect(search().get('g')).toBe('st.1_rd.3'));
  });
});
