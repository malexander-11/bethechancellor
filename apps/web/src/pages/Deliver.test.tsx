import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has agreed two priorities with the PM and reached the package. */
const GAME = 'g=st.2_pr.safer-streets+defence&M=rate.0.75_rpi.0.5';

function at(path: string) {
  window.history.replaceState(null, '', path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  // The sandbox desk still opens with a hand-off; the guided screens have none.
  const go = screen.queryByRole('button', { name: /Continue/ });
  if (go) fireEvent.click(go);
  return view;
}
const L = () => new URLSearchParams(window.location.search).get('L') ?? '';
const h1 = (name: RegExp | string) => screen.getByRole('heading', { level: 1, name });
const ways = (name: RegExp) => screen.getByRole('group', { name });
const box = (name: RegExp) => within(ways(/^Ways to deliver/)).getByRole('checkbox', { name });
const bar = () => screen.getByRole('region', { name: 'Your Budget so far' });
const barFigure = () => bar().querySelector('.bar__figure')?.textContent ?? '';

describe('build your Budget: the ways to deliver', () => {
  it('sends a sandbox with no game to the briefing, and a game that has not seen the PM back to the PM', () => {
    // Flagship policies need priorities, and priorities need a game: the briefing starts one.
    const sandbox = at(`/budget/deliver?${BASE}&L=itbr.1`);
    expect(h1('Your briefing')).toBeInTheDocument();
    sandbox.unmount();
    at(`/budget/deliver?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('says whose budgets a screen’s are (Phase 25), with no badges and no key to them', () => {
    const first = at(`/budget/deliver?${BASE}&${GAME}`);
    // The badges went, and with them the line on the first flagship screen that said what they
    // meant (ADR-0034).
    expect(document.querySelector('.deliver__key')).toBeNull();
    expect(document.querySelector('.badge')).toBeNull();
    expect(screen.queryByText(/Badges say what a figure is/)).toBeNull();
    // Safer streets: prisons, courts and police are England and Wales's; Wales gets no share.
    expect(document.querySelector('.deliver__reach')?.textContent).toMatch(
      /Prisons, courts and police here are England and Wales’s\. Scotland and Northern Ireland get a share through their own grants \(the Barnett formula\), which our prices leave out\./,
    );
    first.unmount();
    // Defence is the UK's, so the second screen has no England line.
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    expect(document.querySelector('.deliver__reach')).toBeNull();
  });

  it('shows one priority per screen, in rank order, with its lead’s line and a way on to the next', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    expect(h1(/^1st Safer streets: prisons, police, borders/)).toBeInTheDocument();
    expect(screen.getByText(/^Flagship policies · 1 of 2$/)).toBeInTheDocument();
    // No voice at the top (Phase 23): the Justice Secretary's line waits in each card's fold, and
    // every card carries one adviser's line saying who proposed it and what it costs and does.
    expect(document.querySelector('.journey > .spoken')).toBeNull();
    expect(screen.getAllByText('Justice Secretary').length).toBeGreaterThan(0);
    expect(screen.queryByText('Defence Secretary')).toBeNull();
    expect(document.querySelector('.badge')).toBeNull();
    const cards = document.querySelectorAll('.choice--option');
    expect(cards.length).toBe(2);
    for (const card of cards) expect(card.querySelector('.choice__advice')).not.toBeNull();
    expect(screen.getByText(/Buys staff and repairs, not new cells yet/)).toBeInTheDocument();
    // Two ways for safer streets: the game has two levers there.
    expect(within(ways(/Ways to deliver: Safer streets/)).getAllByRole('checkbox')).toHaveLength(2);
    // Every card carries the engine's figure for choosing it now, and the headroom that would leave;
    // the year is said once, in the hint. No tabs, no hand-off.
    expect(screen.getAllByText(/Costs £\d+\.\dbn · leaves (−|£)/).length).toBeGreaterThanOrEqual(2);
    // The year is said once, on the bar; no hint repeats it.
    expect(screen.queryByText(/^Figures are for/)).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );
    // On to the second priority, carrying the Budget.
    const next = screen.getByRole('link', { name: 'Next: Defence on the NATO path' });
    expect(next).toHaveAttribute('href', expect.stringMatching(/^\/budget\/deliver\/2\?/));
    fireEvent.click(next);
    expect(h1(/^2nd Defence on the NATO path/)).toBeInTheDocument();
    expect(screen.getByText(/^Flagship policies · 2 of 2$/)).toBeInTheDocument();
    expect(within(ways(/Ways to deliver: Defence/)).getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Next: fine-tune tax and spend' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
  });

  it('says there is nothing to deliver when no priority is ranked, and leads back to the PM', () => {
    at(`/budget/deliver?${BASE}&g=st.2&M=rate.0.75_rpi.0.5`);
    expect(h1('Flagship policies')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing is ranked yet, so there is nothing to deliver.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the Prime Minister' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );
  });

  it('lands a screen number beyond the priorities on the last, and "1" on the bare route', () => {
    const far = at(`/budget/deliver/9?${BASE}&${GAME}`);
    expect(h1(/^2nd Defence/)).toBeInTheDocument();
    far.unmount();
    at(`/budget/deliver/1?${BASE}&${GAME}`);
    expect(h1(/^1st Safer streets/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/pm\?/),
    );
  });

  it('choosing an option moves its levers and the bar keeps score; putting it back restores them', async () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    expect(within(bar()).getByText('0 of 2 priorities delivered')).toHaveClass('bar__short');
    expect(within(bar()).getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    // No target (Phase 24): the rules are the line.
    expect(within(bar()).getByText('rules met')).toBeInTheDocument();
    expect(within(bar()).queryByText(/target/)).toBeNull();
    const gap = () => box(/^Fill the funding gap in the defence investment plan/);
    const card = gap().closest('.choice') as HTMLElement;
    // The card promises the headroom the Budget would then have; the bar shows that figure once
    // the option is in, to the pound.
    const promised = within(card)
      .getByText(/· leaves/)
      .textContent?.match(/leaves (−?£[\d.]+bn)/)?.[1];
    expect(promised).toBeDefined();
    expect(barFigure()).not.toBe(promised);
    fireEvent.click(gap());
    await waitFor(() => expect(L()).toMatch(/dip47\.1/));
    expect(barFigure()).toBe(promised);
    expect(within(bar()).getByText('1 of 2 priorities delivered')).toBeInTheDocument();
    expect(gap()).toBeChecked();
    // Once on, the minister behind the lever reacts, and the card prices what putting it back would
    // undo: the headroom the Budget would have without it.
    expect(screen.getAllByText('Defence Secretary').length).toBeGreaterThanOrEqual(2);
    expect(within(card).getByText(/^Costs £\d+\.\dbn · in your Budget$/)).toBeInTheDocument();
    fireEvent.click(gap());
    await waitFor(() => expect(L()).not.toMatch(/dip47/));
    expect(within(bar()).getByText('0 of 2 priorities delivered')).toBeInTheDocument();
  });

  it('prices each flagship once, interest included: the price and what it leaves add up to the bar', () => {
    // One price per choice (Phase 25, R4): the change to the bar's headroom, with its workings in
    // the fold.
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    const card = box(/^Fill the funding gap in the defence investment plan/).closest(
      '.choice',
    ) as HTMLElement;
    const line = within(card).getByText(/^Costs £\d+\.\dbn · leaves £\d+\.\dbn$/).textContent ?? '';
    const bn = (re: RegExp) => Number(line.match(re)?.[1]);
    const cost = bn(/^Costs £([\d.]+)bn/);
    const leaves = bn(/leaves £([\d.]+)bn/);
    const now = Number(barFigure().replace(/[£bn]/g, ''));
    expect(Math.abs(now - cost - leaves)).toBeLessThanOrEqual(0.15);
    expect(
      within(card).getByText(
        /^The change to your headroom in 2029-30, interest included: day-to-day £0\.\dbn, investment £0\.\dbn, interest £0\.\dbn\.$/,
      ),
    ).toBeInTheDocument();
    // Defence at 3% now costs most before the target year, and says so.
    const now3 = box(/^Defence at 3% of GDP now/).closest('.choice') as HTMLElement;
    expect(
      within(now3).getByText(/^Costs £\d+\.\dbn, more in earlier years · leaves/),
    ).toBeInTheDocument();
    expect(
      within(now3).getByText(/It costs most in 2027-28: £\d+\.\dbn, before interest\./),
    ).toBeInTheDocument();
  });

  it('names a missed rule on the bar by its plain name and the engine’s own margin', () => {
    // Investment up a tenth on today's estimate: the day-to-day headroom stays positive, the debt
    // rule is missed (Phase 25, R13). The bar says which, and by how much.
    at(`/budget/deliver?${BASE}&g=st.2_pr.homes-growth&M=rate.0.75_rpi.0.5&L=cdel.10`);
    expect(barFigure()).toBe('£5.0bn');
    expect(within(bar()).getByText('Debt rule missed by £4.5bn')).toHaveClass('bar__missed');
  });

  it('prices investment on the debt rule, which it touches', () => {
    at(`/budget/deliver?${BASE}&g=st.2_pr.homes-growth&M=rate.0.75_rpi.0.5`);
    const invest = box(/^Spend 10% more on public investment/).closest('.choice') as HTMLElement;
    expect(
      within(invest).getByText(/^On the debt rule: costs £\d+\.\dbn · leaves (−|£)/),
    ).toBeInTheDocument();
    expect(within(invest).getByText(/^The change to the debt rule in 2029-30/)).toBeInTheDocument();
  });

  it('says which ways only make a start, and counts a ticked start as started, not delivered', async () => {
    // Graded delivery (Phase 25): the care down-payment starts the NHS priority; the health uplift
    // delivers it. The reason is a judgement, one fold away.
    at(`/budget/deliver?${BASE}&g=st.2_pr.nhs&M=rate.0.75_rpi.0.5`);
    const card = (name: RegExp) => box(name).closest('.choice') as HTMLElement;
    const care = card(/^A down-payment on the National Care Service/);
    expect(within(care).getByText('Makes a start')).toBeInTheDocument();
    expect(
      within(care).getByText(/^Makes a start, not delivery: the Prime Minister calls it/),
    ).toBeInTheDocument();
    expect(
      within(card(/^Give the NHS more than the Spending Review planned/)).queryByText(
        'Makes a start',
      ),
    ).toBeNull();
    fireEvent.click(box(/^A down-payment on the National Care Service/));
    await waitFor(() => expect(L()).toMatch(/mhclg\.5/));
    expect(within(bar()).getByText('0 of 1 priority delivered · 1 started')).toHaveClass(
      'bar__short',
    );
    fireEvent.click(box(/^Give the NHS more than the Spending Review planned/));
    await waitFor(() => expect(L()).toMatch(/dhsc\.3/));
    expect(within(bar()).getByText('1 of 1 priority delivered')).not.toHaveClass('bar__short');
  });

  it('shows a lever trimmed elsewhere as settled lower, and one moved the other way as against it', () => {
    // Graded delivery (Phase 25): trimmed short of what was chosen, the priority is started, not
    // delivered, and the bar says so in amber.
    const first = at(`/budget/deliver?${BASE}&${GAME}&L=moj.5`);
    const prisons = box(/More money for prisons and courts/);
    expect(prisons).not.toBeChecked();
    const card = prisons.closest('.choice') as HTMLElement;
    expect(within(card).getByText(/^Settled lower: /)).toHaveClass('tag--amber');
    expect(card.className).toMatch(/choice--adjusted/);
    expect(within(bar()).getByText('0 of 2 priorities delivered · 1 started')).toHaveClass(
      'bar__short',
    );
    first.unmount();
    at(`/budget/deliver?${BASE}&${GAME}&L=moj.-2`);
    const against = box(/More money for prisons and courts/).closest('.choice') as HTMLElement;
    expect(within(against).getByText(/^Moved the other way: /)).toHaveClass('tag--warn');
    expect(within(bar()).getByText('0 of 2 priorities delivered')).toBeInTheDocument();
  });

  it('wears the red lines, the earliest starts and a later start on the options that carry them', async () => {
    at(`/budget/deliver?${BASE}&g=st.2_pr.welfare-bill+families&M=rate.0.75_rpi.0.5`);
    expect(h1(/^1st Get the welfare bill down/)).toBeInTheDocument();
    const twoChild = box(/Reinstate the two-child limit/);
    const twoChildCard = twoChild.closest('.choice') as HTMLElement;
    // A Budget 2025 decision, not the manifesto's words: a promise, and red all the same (Phase 25).
    expect(
      within(twoChildCard).getByText('Would break a promise: The two-child limit stays abolished'),
    ).toBeInTheDocument();
    fireEvent.click(twoChild);
    await waitFor(() =>
      expect(
        within(twoChildCard).getByText('Breaks a promise: The two-child limit stays abolished'),
      ).toBeInTheDocument(),
    );
    // The unemployment insurance limit cannot start before 2030-31: the card says so (ADR-0021).
    const insurance = box(/Time-limit the new unemployment insurance/).closest(
      '.choice',
    ) as HTMLElement;
    expect(
      within(insurance).getByText(/Nothing until 2030-31, then saves £1\.4bn · leaves/),
    ).toBeInTheDocument();
    // The child tax allowance is on the next screen, starts in 2028-29 and wears the tag.
    fireEvent.click(screen.getByRole('link', { name: 'Next: Families and child poverty' }));
    const allowance = box(/A child tax allowance/).closest('.choice') as HTMLElement;
    expect(within(allowance).getByText(/Earliest start/)).toBeInTheDocument();
    expect(within(allowance).getByText(/April 2028/)).toBeInTheDocument();
    // The choice made on the screen before is still in the Budget.
    await waitFor(() => expect(L()).toMatch(/rv2ch\.1/));
  });

  it('blocks an option that counts the same money as one already chosen, and says by what', async () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    const gap = () => box(/^Fill the funding gap in the defence investment plan/);
    const three = () => box(/^Defence at 3% of GDP now/);
    expect(gap()).toBeEnabled();
    fireEvent.click(three());
    await waitFor(() => expect(L()).toMatch(/def3\.1/));
    // The gap is blocked while the 3% option is in (Phase 25): its checkbox stays in the tab
    // order but will not tick, and one plain sentence at full contrast says what to untick and
    // why; the price is the swap it offers, never both at once.
    expect(gap()).toBeEnabled();
    expect(gap()).toHaveAttribute('aria-disabled', 'true');
    expect(gap()).toHaveAccessibleDescription(
      /You can’t have both\. Untick “Defence at 3% of GDP now, not in 2030-31” to choose this\./,
    );
    const gapCard = gap().closest('.choice') as HTMLElement;
    expect(gapCard.className).toMatch(/choice--blocked/);
    expect(within(gapCard).getByText(/Funding both counts some money twice/)).toBeInTheDocument();
    expect(within(gapCard).getByText(/^Swap them: /)).toBeInTheDocument();
    fireEvent.click(gap());
    expect(L()).toMatch(/def3\.1/);
    expect(L()).not.toMatch(/dip47/);
    // The 3% option itself is not blocked by the pair it is in.
    expect(three()).not.toHaveAttribute('aria-disabled');
    // One tap swaps them.
    fireEvent.click(within(gapCard).getByRole('button', { name: /Swap them/ }));
    await waitFor(() => expect(L()).toMatch(/dip47\.1/));
    expect(L()).not.toMatch(/def3/);
    expect(three()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(
      within(three().closest('.choice') as HTMLElement).getByRole('button', { name: /Swap them/ }),
    );
    await waitFor(() => expect(L()).toMatch(/def3\.1/));
    expect(L()).not.toMatch(/dip47/);
    fireEvent.click(three());
    await waitFor(() => expect(L()).not.toMatch(/def3/));
    expect(gap()).not.toHaveAttribute('aria-disabled');
    expect(gapCard.className).not.toMatch(/choice--blocked/);
  });

  it('with both sides of a pair in from the desk, both cards warn and neither is blocked', () => {
    at(`/budget/deliver/2?${BASE}&${GAME}&L=def3.1_dip47.1`);
    const gap = box(/^Fill the funding gap in the defence investment plan/);
    const three = box(/^Defence at 3% of GDP now/);
    expect(gap).toBeEnabled();
    expect(three).toBeEnabled();
    expect(gap).toBeChecked();
    expect(three).toBeChecked();
    expect(
      within(gap.closest('.choice') as HTMLElement).getByText(
        /^Warning: both this and Defence at 3% of GDP now, not in 2030-31 are in your Budget/,
      ),
    ).toBeInTheDocument();
    expect(
      within(three.closest('.choice') as HTMLElement).getByText(
        /^Warning: both this and Fill the funding gap in the defence investment plan are in your Budget/,
      ),
    ).toBeInTheDocument();
  });

  it('names the options it overlaps before either is chosen, and quotes the interaction once the other moves', () => {
    const cost = 'g=st.2_pr.cost-of-living&M=rate.0.75_rpi.0.5';
    const quiet = at(`/budget/deliver?${BASE}&${cost}`);
    const freeze = () => box(/^End the threshold freeze early/).closest('.choice') as HTMLElement;
    // Fine-tuning offers the basic rate; the two interact, so the card says so, quietly.
    const note = within(freeze()).getByText('Overlaps with Basic rate');
    expect(note.className).not.toMatch(/choice__overlap--warn/);
    quiet.unmount();
    at(`/budget/deliver?${BASE}&${cost}&L=itbr.1`);
    const moved = within(freeze()).getByText(
      /^Overlaps with Basic rate: Both change the income tax base/,
    );
    expect(moved.className).not.toMatch(/choice__overlap--warn/);
  });

  it('leads on to fine-tuning, with no side door to the desk: step 4 has every lever', async () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    expect(screen.queryByRole('link', { name: /More policies/ })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Next: fine-tune tax and spend' }));
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('g')).toMatch(/^st\.3/),
    );
  });
});

/** The ways on show, by option id, in order. */
const shownWays = () =>
  [...document.querySelectorAll('[data-option]')].map((e) => e.getAttribute('data-option'));

describe('flagship policies in basic mode: the best ways first (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('shows defence’s pick and the plan’s gap on the desk, then every way, keeping the focus', () => {
    at(`/budget/deliver/2?${BASE}&${GAME}`);
    // The uplift is the pick; the gap shows because the briefing puts it on the desk.
    expect(shownWays()).toEqual(['dip-gap', 'defence-uplift']);
    const line = document.querySelector('.mode-line') as HTMLElement;
    expect(line).toHaveTextContent(/^A shortlist\./);
    expect(line.querySelector('.badge')).toBeNull();
    const button = screen.getByRole('button', { name: 'See every idea (all 3 ways)' });
    button.focus();
    fireEvent.click(button);
    expect(shownWays()).toEqual(['dip-gap', 'three-per-cent-now', 'defence-uplift']);
    expect(screen.getByRole('button', { name: 'Show only the best ideas' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(within(line).getByRole('status')).toHaveTextContent('Every idea is on show.');
    expect(line.textContent).not.toMatch(/A shortlist/);
    // The bar counts every way in either mode.
    expect(within(bar()).getByText('0 of 2 priorities delivered')).toBeInTheDocument();
    // And back, the same button, remembered in the browser.
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /^See every idea/ })).toBe(button);
    expect(within(line).getByRole('status')).toHaveTextContent('Only the best ideas are on show.');
    expect(shownWays()).toEqual(['dip-gap', 'defence-uplift']);
    expect(window.localStorage.getItem('btc.mode.v1')).toBe('basic');
  });

  it('has no line where nothing is hidden: safer streets offers two ways, both picked', () => {
    at(`/budget/deliver?${BASE}&${GAME}`);
    expect(shownWays()).toEqual(['prisons', 'borders']);
    expect(document.querySelector('.mode-line')).toBeNull();
  });

  it('keeps a way chosen before the screen opened on show, beside the one it blocks', () => {
    at(`/budget/deliver/2?${BASE}&${GAME}&L=def3.1`);
    expect(shownWays()).toEqual(['dip-gap', 'three-per-cent-now', 'defence-uplift']);
    expect(box(/^Defence at 3% of GDP now/)).toBeChecked();
    expect(box(/^Fill the funding gap in the defence investment plan/)).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('offers one way to bring the welfare bill down: going ahead with the PIP cuts', () => {
    at(`/budget/deliver?${BASE}&g=st.2_pr.welfare-bill&M=rate.0.75_rpi.0.5`);
    expect(shownWays()).toEqual(['pip-changes']);
    expect(screen.getByRole('button', { name: 'See every idea (all 5 ways)' })).toBeInTheDocument();
  });
});
