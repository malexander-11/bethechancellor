import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has agreed two priorities with the PM and reached fine-tuning. */
const GAME = 'g=st.3_pr.safer-streets+defence';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
const h1 = (name: RegExp | string) => screen.getByRole('heading', { level: 1, name });
const group = (name: RegExp) => screen.getByRole('region', { name });
const bar = () => screen.getByRole('region', { name: 'Your Budget so far' });
const barFigure = () => bar().querySelector('.bar__figure')?.textContent ?? '';
/** The card a control sits in. */
const cardOf = (control: HTMLElement) => control.closest('.lever') as HTMLElement;
const search = () => new URLSearchParams(window.location.search);

describe('fine-tune tax and spend: the curated levers', () => {
  it('lays the tax screen out as five who-pays groups of real levers, with one way on', () => {
    const { container } = at(`/finetune/tax?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    // The lead names the adviser once; the cards carry no name (Phase 25).
    expect(
      screen.getByText(
        'Raise or cut any tax. Watch your headroom move. Your Director of Tax’s view is on each lever.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 1 of 2$/)).toBeInTheDocument();
    expect(bar()).toBeInTheDocument();
    const names = screen
      .getAllByRole('region')
      .map((r) => r.getAttribute('aria-labelledby') ?? '')
      .filter((id) => id.startsWith('tune-'));
    expect(names).toEqual([
      'tune-everyone',
      'tune-best-off',
      'tune-business',
      'tune-savers-owners',
      'tune-duties',
    ]);
    expect(group(/^Everyone 7 levers/)).toBeInTheDocument();
    expect(group(/^Drivers, smokers, gamblers and flyers 6 levers/)).toBeInTheDocument();
    // Stacked, not tabbed; one primary button; every lever with its adviser's line.
    expect(screen.queryByRole('tab')).toBeNull();
    expect(container.querySelectorAll('.btn--primary')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Next: spending' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
    const levers = container.querySelectorAll('.lever--curated');
    expect(levers).toHaveLength(28);
    for (const lever of levers) {
      expect(lever.querySelector('.choice__advice')).not.toBeNull();
      expect(lever.querySelector('.choice__advice .kicker')).toBeNull();
    }
    // The controls carry their plain titles as their names.
    expect(
      screen.getByRole('slider', { name: 'The basic rate of income tax' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Bring back the health and social care levy' }),
    ).toBeInTheDocument();
  });

  it('prices a lever before it moves, then says what it does, and the bar keeps score', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const penny = screen.getByRole('slider', { name: 'The basic rate of income tax' });
    const card = cardOf(penny);
    // At rest: what the adviser's usual move would do, on HMRC's own figure, and what the
    // headroom would then be, interest included (Phase 25), which the screen says once. It is in
    // the conditional, so it cannot read as money already in the Budget.
    expect(within(card).getByText(/^Up 1p to 21%: would raise/).textContent).toMatch(
      /^Up 1p to 21%: would raise £\d\.\dbn · headroom would be £\d+\.\dbn$/,
    );
    expect(
      screen.getByText(
        'Headroom also moves with the interest on borrowing, so it can move more than a tax raises.',
      ),
    ).toBeInTheDocument();
    // The resting tag names the promise, and the name opens what it covers (Phase 25).
    expect(card.querySelector('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    expect(within(card).getByRole('button', { name: 'Tax lock' })).toBeInTheDocument();
    // The curated slider stops where HMRC's figure stops: 2p either way (Phase 25).
    expect(penny).toHaveAttribute('min', '-2');
    expect(penny).toHaveAttribute('max', '2');
    const before = barFigure();
    fireEvent.change(penny, { target: { value: '1' } });
    // Moved: the hint gives way to the lever's own effect line, the red line is crossed, the
    // group says what it now raises, and the bar has moved.
    expect(within(card).queryByText(/^Up 1p to 21%/)).toBeNull();
    expect(
      within(card).getByText(/Day-to-day budget in 2029-30: raises £\d\.\dbn/),
    ).toBeInTheDocument();
    expect(within(card).getByText('Breaks the manifesto: The tax lock')).toHaveClass('tag--warn');
    expect(group(/^Everyone 1 moved · raises £\d\.\dbn/)).toBeInTheDocument();
    expect(barFigure()).not.toBe(before);
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.1/));
  });

  it('marks the levy amber, not red: the tax lock strained', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const levy = screen.getByRole('checkbox', {
      name: 'Bring back the health and social care levy',
    });
    const card = cardOf(levy);
    expect(
      within(card).getByText(/^If you switch it on: would raise £\d+\.\dbn · headroom would be/),
    ).toBeInTheDocument();
    expect(card.querySelector('.tag--manifesto')?.textContent).toMatch(
      /^Tax lock: keeps its words, strains its spirit/,
    );
    fireEvent.click(levy);
    expect(within(card).getByText('Strains the manifesto: The tax lock')).toHaveClass('tag--amber');
    expect(within(card).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
  });

  it('keeps a lever moved inside the fold where it is, and shows it at the top next time', () => {
    const first = at(`/finetune/tax?${BASE}&${GAME}`);
    const everyone = group(/^Everyone/);
    const fold = within(everyone).getByText('4 more levers').closest('details') as HTMLElement;
    const premium = within(fold).getByRole('slider', { name: 'Insurance premium tax' });
    fireEvent.click(within(fold).getByText('4 more levers'));
    fireEvent.change(premium, { target: { value: '2' } });
    // Still in the fold: the slider never jumps from under the pointer.
    expect(within(fold).getByRole('slider', { name: 'Insurance premium tax' })).toBe(premium);
    first.unmount();
    // The next visit finds it moved, and on show.
    at(`/finetune/tax?${BASE}&${GAME}&L=ipt.2`);
    const again = group(/^Everyone 1 moved/);
    const folded = within(again).getByText('3 more levers').closest('details') as HTMLElement;
    expect(within(folded).queryByRole('slider', { name: 'Insurance premium tax' })).toBeNull();
    expect(
      within(again).getByRole('slider', { name: 'Insurance premium tax' }),
    ).toBeInTheDocument();
  });

  it('warns when two levers overlap: last year’s cancelled rise against a fuel duty cut', () => {
    at(`/finetune/tax?${BASE}&g=st.3_pr.cost-of-living&L=fuel.-10`);
    const restore = cardOf(
      screen.getByRole('checkbox', { name: 'Add back last year’s cancelled fuel duty rise' }),
    );
    expect(
      within(restore).getByText(
        /^Warning: Overlaps with Cut fuel duty by 10%: Both change fuel duty rates/,
      ),
    ).toHaveClass('choice__overlap--warn');
    // The freeze a Chancellor faces this autumn is on show, and costs money (Phase 25).
    const freeze = cardOf(screen.getByRole('checkbox', { name: 'Freeze fuel duty in April 2027' }));
    expect(
      within(freeze).getByText(/^If you switch it on: would cost £0\.\dbn · headroom would be/),
    ).toBeInTheDocument();
  });

  it('reads a relief cost as the most it could raise, and says why in plain words', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const pensions = cardOf(
      screen.getByRole('checkbox', {
        name: 'Charge employer National Insurance on pension contributions',
      }),
    );
    expect(
      within(pensions).getByText(
        /^If you switch it on: would raise at most £1\d\.\dbn · headroom would be/,
      ),
    ).toBeInTheDocument();
    expect(
      within(pensions).getByText(
        'HMRC’s cost of the tax break. The real sum would be less, as people change what they do.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Charge employer National Insurance on pension contributions',
      }),
    );
    expect(
      within(pensions).getByText(/Day-to-day budget in 2029-30: raises at most £1\d\.\dbn/),
    ).toBeInTheDocument();
  });

  it('will not let two taxes that count the same money both in, and swaps them in one tap', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=cgtalign.1`);
    const death = screen.getByRole('checkbox', { name: 'Tax capital gains when someone dies' });
    const card = cardOf(death);
    expect(death).toHaveAttribute('aria-disabled', 'true');
    expect(death).toHaveAccessibleDescription(
      /You can’t have both\. Untick “Tax capital gains at the same rates as income” to choose this\./,
    );
    expect(card.className).toMatch(/lever--blocked/);
    // Priced as the swap it offers, never as both at once.
    expect(
      within(card).getByText(/^If you swap them: would cost £\d+\.\dbn · headroom would be/),
    ).toBeInTheDocument();
    fireEvent.click(death);
    expect(search().get('L')).toMatch(/cgtalign\.1/);
    expect(search().get('L') ?? '').not.toMatch(/cgtdth/);
    fireEvent.click(within(card).getByRole('button', { name: /Swap them/ }));
    await waitFor(() => expect(search().get('L')).toMatch(/cgtdth\.1/));
    expect(search().get('L') ?? '').not.toMatch(/cgtalign/);
    expect(
      screen.getByRole('checkbox', { name: 'Tax capital gains at the same rates as income' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('lays out the spending screen, with a minister once a budget moves and the flagships tagged', () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(group(/^Public services 1 moved · costs £\d\.\dbn/)).toBeInTheDocument();
    expect(group(/^Investment 2 levers/)).toBeInTheDocument();
    // The defence plan's gap is on the desk before any priority is chosen (Phase 25).
    expect(
      screen.getByRole('checkbox', { name: 'Fund the defence plan’s gap' }),
    ).toBeInTheDocument();
    // The lead's hundred and twenty characters cannot say how long the deals run: a note does.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
    expect(screen.getByText(/falling 4\.4% a year after inflation/)).toBeInTheDocument();
    // Whose budgets most of these are: England's, and the other nations' share left out (Phase 25).
    expect(
      screen.getByText(/^Most public services here are England’s budgets\./),
    ).toBeInTheDocument();
    expect(group(/^Benefits 4 levers/)).toBeInTheDocument();
    expect(group(/^Last year’s decisions 5 levers/)).toBeInTheDocument();
    // The prisons budget belongs to a flagship the player chose; moved before arrival, it is on show.
    const prisons = cardOf(screen.getByRole('slider', { name: 'Prisons and courts' }));
    expect(within(prisons).getByText('In your flagship policies')).toBeInTheDocument();
    expect(within(prisons).getByText('Justice Secretary')).toBeInTheDocument();
    expect(document.querySelectorAll('.lever--curated .choice__advice .kicker')).toHaveLength(0);
    expect(
      screen.getByText(
        'Trim or top up any budget. A top-up costs what a trim saves. Your Director of Public Spending’s view is on each lever.',
      ),
    ).toBeInTheDocument();
    // Untouched, a budget has no minister on it; cut, its minister says what stops happening.
    const schools = screen.getByRole('slider', { name: 'Schools and education' });
    expect(within(cardOf(schools)).queryByText('Education Secretary')).toBeNull();
    // At rest, a cut in cash terms, so it cannot be read as the growth rate the card leads with.
    expect(
      within(cardOf(schools)).getByText(/^Cut the budget by 1%: would save £\d\.\dbn/),
    ).toBeInTheDocument();
    expect(
      within(cardOf(schools)).getByText('Falls 0.3% a year after rising prices, as planned'),
    ).toBeInTheDocument();
    fireEvent.change(schools, { target: { value: '-1' } });
    expect(within(cardOf(schools)).getByText('Education Secretary')).toBeInTheDocument();
    // Moved: the new path beside the plan, and the money in the card's one year.
    expect(
      within(cardOf(schools)).getByText('Falls 0.8% a year after rising prices (planned: 0.3%)'),
    ).toBeInTheDocument();
    expect(
      within(cardOf(schools)).getByText(/^£\d\.\dbn less than planned in 2029-30$/),
    ).toBeInTheDocument();
    // A flagship budget cut below what was chosen is settled lower, and the Chief Secretary says
    // so (Phase 25); cut below where it started, it is against the flagship.
    fireEvent.change(screen.getByRole('slider', { name: 'Prisons and courts' }), {
      target: { value: '5' },
    });
    expect(
      within(prisons).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'Prisons and courts' }), {
      target: { value: '-2' },
    });
    expect(within(prisons).getByText('Against your flagship policy')).toHaveClass('tag--warn');
  });

  it('leads from the spending screen to the review, the package intact', async () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10_hscl.1`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Next: deliver the Budget' }));
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.4_pr.safer-streets+defence');
      expect(search().get('L')).toMatch(/hscl\.1/);
      expect(search().get('S')).toBeNull();
    });
  });

  it('opens every lever on the desk, and comes back', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('link', { name: 'Every tax lever' }));
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to fine-tuning tax' }));
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });

  it('sends the old and odd addresses to the right screen, and a sandbox to the desk', () => {
    const old = at(`/budget/afford?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    old.unmount();
    const bare = at(`/finetune?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    bare.unmount();
    const odd = at(`/finetune/nothing?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    odd.unmount();
    const sandbox = at(`/finetune/spending?${BASE}&L=dfe.-2`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByText(/The Director of Public Spending’s briefing/)).toBeInTheDocument();
    sandbox.unmount();
    // A game that has not yet agreed its priorities is sent back to them.
    at(`/finetune/tax?${BASE}&g=st.1`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('lets one adviser speak above the cards, the most pressing, one at a time (Phase 25)', () => {
    // Nothing delivers defence yet: the Director of Public Spending says so.
    const quiet = at(`/finetune/tax?${BASE}&${GAME}&L=moj.10`);
    let advisers = screen.getByRole('region', { name: 'Your advisers' });
    expect(
      within(advisers).getByText(/^Defence on the NATO path is an agreed priority\./),
    ).toBeInTheDocument();
    quiet.unmount();
    // A penny on the basic rate breaks the tax lock, which comes first: one line, and no chorus.
    at(`/finetune/tax?${BASE}&${GAME}&L=moj.10_itbr.1`);
    advisers = screen.getByRole('region', { name: 'Your advisers' });
    expect(
      within(advisers).getByText(/^The tax lock is a manifesto red line, Chancellor\./),
    ).toBeInTheDocument();
    expect(within(advisers).queryByText(/agreed priority/)).toBeNull();
    expect(within(advisers).queryByText(/What the advisers say/)).toBeNull();
  });

  it('has the bar say what changed, once a slider settles (Phase 25)', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const status = within(bar()).getByRole('status');
    // Mounted empty: nothing is said on arrival.
    expect(status).toBeEmptyDOMElement();
    fireEvent.change(screen.getByRole('slider', { name: 'The basic rate of income tax' }), {
      target: { value: '1' },
    });
    // Nothing while the slider may still be moving; then only what changed, in the bar's words.
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status.textContent).toMatch(/^Headroom, 2029-30: £\d+\.\dbn\./), {
      timeout: 3000,
    });
    expect(status.textContent).toMatch(/1 promise broken\.$/);
    expect(status.textContent).not.toMatch(/rules met/);
  });
});
