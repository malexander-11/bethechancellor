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
/** A policy's card, by its title. */
const policy = (name: string) => cardOf(screen.getByRole('heading', { name }));
/** Open a group's fold of more policies. */
const openFold = (name: RegExp) => {
  const summary = within(group(name)).getByText(/^\d+ more polic(y|ies)$/);
  fireEvent.click(summary);
  return summary.closest('details') as HTMLElement;
};
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
    // A lever that moves both ways offers two policies, one each way, and every other tax toggle
    // waits in its group's fold (Phase 26).
    expect(group(/^Everyone 21 policies/)).toBeInTheDocument();
    expect(group(/^Drivers, smokers, gamblers and flyers 9 policies/)).toBeInTheDocument();
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
    // Three on show a group, the rest mounted only when their fold opens (Phase 26).
    const levers = container.querySelectorAll('.lever--curated');
    expect(levers).toHaveLength(15);
    for (const lever of levers) {
      expect(lever.querySelector('.choice__advice')).not.toBeNull();
      expect(lever.querySelector('.choice__advice .kicker')).toBeNull();
    }
    // No slider anywhere: a policy is a tick, or a choice of sizes.
    expect(screen.queryByRole('slider')).toBeNull();
    const penny = policy('Put up the basic rate of income tax');
    expect(
      within(penny)
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['Small 21%', 'Medium 22%', 'Large 25%']);
    expect(
      screen.getByRole('checkbox', { name: 'Bring back the health and social care levy' }),
    ).toBeInTheDocument();
    // The other way waits in the fold, which mounts its cards when opened.
    expect(screen.queryByRole('heading', { name: 'Cut the basic rate of income tax' })).toBeNull();
    const fold = openFold(/^Everyone/);
    expect(
      within(fold).getByRole('heading', { name: 'Cut the basic rate of income tax' }),
    ).toBeInTheDocument();
    // Its policies sit under their levers' families, the toggles that joined among them.
    expect(within(fold).getByRole('heading', { name: 'Income tax' })).toBeInTheDocument();
    expect(within(fold).getByRole('heading', { name: 'VAT' })).toBeInTheDocument();
    expect(
      within(fold).getByRole('heading', { name: 'Budget 2025 decisions' }),
    ).toBeInTheDocument();
    expect(
      within(fold).getByRole('checkbox', { name: 'End the threshold freeze early' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.lever--curated')).toHaveLength(33);
  });

  it('prices a policy before it is chosen, then says what it does, and the bar keeps score', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const card = policy('Put up the basic rate of income tax');
    // At rest: what the smallest size would do, on HMRC's own figure, and what the headroom would
    // then be, interest included (Phase 25), which the screen says once. It is in the
    // conditional, so it cannot read as money already in the Budget.
    expect(within(card).getByText(/^Small: would raise/).textContent).toMatch(
      /^Small: would raise £\d\.\dbn · headroom would be £\d+\.\dbn$/,
    );
    expect(
      screen.getByText(
        'Headroom also moves with the interest on borrowing, so it can move more than a tax raises.',
      ),
    ).toBeInTheDocument();
    // The resting tag names the promise, and the name opens what it covers (Phase 25).
    expect(card.querySelector('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    expect(within(card).getByRole('button', { name: 'Tax lock' })).toBeInTheDocument();
    const before = barFigure();
    fireEvent.click(within(card).getByRole('radio', { name: 'Medium 22%' }));
    // Chosen: the hint gives way to the lever's own effect line, the red line is crossed, the
    // group says what it now raises, and the bar has moved.
    expect(within(card).queryByText(/^Small: would raise/)).toBeNull();
    expect(within(card).getByRole('radio', { name: 'Medium 22%' })).toBeChecked();
    expect(
      within(card).getByText(/Day-to-day budget in 2029-30: raises £\d+\.\dbn/),
    ).toBeInTheDocument();
    expect(within(card).getByText('Breaks the manifesto: The tax lock')).toHaveClass('tag--warn');
    expect(group(/^Everyone 1 chosen · raises £\d+\.\dbn/)).toBeInTheDocument();
    expect(barFigure()).not.toBe(before);
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.2/));
    // Large goes past HMRC's figure: the straight line is the game's arithmetic, and says so.
    fireEvent.click(within(card).getByRole('radio', { name: 'Large 25%' }));
    expect(
      within(card).getByText(/Beyond 2p the game scales it in a straight line/),
    ).toBeInTheDocument();
    // The other way, in the fold, would replace it; choosing it clears this one (Phase 26).
    const fold = openFold(/^Everyone/);
    const cut = cardOf(
      within(fold).getByRole('heading', { name: 'Cut the basic rate of income tax' }),
    );
    expect(
      within(cut).getByText('Choosing this replaces Put up the basic rate of income tax (25%).'),
    ).toBeInTheDocument();
    fireEvent.click(within(cut).getByRole('radio', { name: 'Small 19%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.-1/));
    for (const radio of within(card).getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(
      within(card).getByText('Choosing this replaces Cut the basic rate of income tax (19%).'),
    ).toBeInTheDocument();
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

  it('keeps a policy chosen inside the fold where it is, and shows it at the top next time', () => {
    const first = at(`/finetune/tax?${BASE}&${GAME}`);
    const fold = openFold(/^Everyone/);
    expect(within(fold).getByText('18 more policies')).toBeInTheDocument();
    const premium = cardOf(
      within(fold).getByRole('heading', { name: 'Put up insurance premium tax' }),
    );
    fireEvent.click(within(premium).getByRole('radio', { name: 'Small 14%' }));
    // Still in the fold: the card never jumps from under the pointer.
    expect(
      cardOf(within(fold).getByRole('heading', { name: 'Put up insurance premium tax' })),
    ).toBe(premium);
    first.unmount();
    // The next visit finds it chosen, and on show; its other way stays in the fold.
    at(`/finetune/tax?${BASE}&${GAME}&L=ipt.2`);
    const again = group(/^Everyone 1 chosen/);
    expect(within(again).getByText('17 more policies')).toBeInTheDocument();
    expect(
      within(policy('Put up insurance premium tax')).getByRole('radio', { name: 'Small 14%' }),
    ).toBeChecked();
    const folded = openFold(/^Everyone/);
    expect(
      within(folded).queryByRole('heading', { name: 'Put up insurance premium tax' }),
    ).toBeNull();
    expect(
      within(folded).getByRole('heading', { name: 'Cut insurance premium tax' }),
    ).toBeInTheDocument();
  });

  it('warns when two levers overlap: last year’s cancelled rise against a fuel duty cut', () => {
    at(`/finetune/tax?${BASE}&g=st.3_pr.cost-of-living&L=fuel.-10`);
    openFold(/^Drivers/);
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

  it('lays out the spending screen, with a minister once a budget moves and the flagships held', () => {
    const held = at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(group(/^Public services 1 chosen · costs £\d\.\dbn/)).toBeInTheDocument();
    expect(group(/^Investment 5 policies/)).toBeInTheDocument();
    // The defence plan's gap is on show before any priority is chosen (Phase 25), and council
    // homes fill the group's third place (Phase 26).
    expect(
      screen.getByRole('checkbox', { name: 'Fund the defence plan’s gap' }),
    ).toBeInTheDocument();
    expect(
      within(group(/^Investment/)).getByRole('checkbox', {
        name: 'More council and social rent homes',
      }),
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
    expect(group(/^Benefits 15 policies/)).toBeInTheDocument();
    expect(group(/^Last year’s decisions 5 policies/)).toBeInTheDocument();
    // The prisons budget is where the flagship the player chose set it: one line, and the way
    // back to that flagship; no card that could quietly undo it (Phase 26).
    const prisons = cardOf(screen.getByRole('heading', { name: 'Prisons and courts' }));
    expect(within(prisons).getByText('In your flagship policies')).toBeInTheDocument();
    expect(within(prisons).queryAllByRole('radio')).toHaveLength(0);
    expect(prisons.querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    expect(within(prisons).getByRole('link', { name: /Change/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    expect(document.querySelectorAll('.lever--curated .choice__advice .kicker')).toHaveLength(0);
    expect(
      screen.getByText(
        'Trim or top up any budget. A top-up costs what a trim saves. Your Director of Public Spending’s view is on each lever.',
      ),
    ).toBeInTheDocument();
    // Untouched, a budget has no minister on it; cut, its minister says what stops happening.
    const schools = policy('Cut schools and education');
    expect(within(schools).queryByText('Education Secretary')).toBeNull();
    // At rest, the smallest cut in cash terms, beside the sizes' shares of the budget.
    expect(within(schools).getByText(/^Small: would save £\d\.\dbn/)).toBeInTheDocument();
    expect(within(schools).getByRole('radio', { name: 'Small 1% less' })).toBeInTheDocument();
    expect(
      within(schools).getByText('Falls 0.3% a year after rising prices, as planned'),
    ).toBeInTheDocument();
    fireEvent.click(within(schools).getByRole('radio', { name: 'Small 1% less' }));
    expect(within(schools).getByText('Education Secretary')).toBeInTheDocument();
    // Chosen: the new path beside the plan, and the money in the card's one year.
    expect(
      within(schools).getByText('Falls 0.8% a year after rising prices (planned: 0.3%)'),
    ).toBeInTheDocument();
    expect(
      within(schools).getByText(/^£\d\.\dbn less than planned in 2029-30$/),
    ).toBeInTheDocument();
    held.unmount();
    // Short of the flagship, a top-up is a card: the flagship settled lower, and the Chief
    // Secretary says so (Phase 25); a cut is against it.
    const lower = at(`/finetune/spending?${BASE}&${GAME}&L=moj.5`);
    const topUp = policy('Spend more on prisons and courts');
    expect(within(topUp).getByRole('radio', { name: 'Large 5% more' })).toBeChecked();
    expect(within(topUp).getByText('In your flagship policies')).toBeInTheDocument();
    expect(
      within(topUp).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    lower.unmount();
    const against = at(`/finetune/spending?${BASE}&${GAME}&L=moj.-2`);
    const trim = policy('Cut prisons and courts');
    expect(within(trim).getByRole('radio', { name: 'Medium 2% less' })).toBeChecked();
    expect(within(trim).getByText('Against your flagship policy')).toHaveClass('tag--warn');
    against.unmount();
    // Past its flagship's value, a top-up stays a card that shows its own size; a setting no size
    // matches says what it is (Phase 26).
    const past = at(`/finetune/spending?${BASE}&g=st.3_pr.nhs&L=dhsc.5`);
    const nhs = policy('Spend more on health and social care');
    expect(within(nhs).getByRole('radio', { name: 'Large 5% more' })).toBeChecked();
    expect(within(nhs).getByText('In your flagship policies')).toBeInTheDocument();
    past.unmount();
    at(`/finetune/spending?${BASE}&${GAME}&L=dhsc.3`);
    const stray = policy('Spend more on health and social care');
    expect(within(stray).getByText('Now 3% more')).toBeInTheDocument();
    for (const radio of within(stray).getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('offers the way back to a flagship, not a swap, when the flagship holds the other of a pair', () => {
    // The 3% path, chosen for defence on step 3, holds its lever; the plan's gap counts some of the
    // same money, so step 4 cannot swap it in behind the flagship's back (Phase 26).
    at(`/finetune/spending?${BASE}&${GAME}&L=def3.1`);
    const gap = screen.getByRole('checkbox', { name: 'Fund the defence plan’s gap' });
    const card = cardOf(gap);
    expect(gap).toHaveAttribute('aria-disabled', 'true');
    expect(gap).toHaveAccessibleDescription(
      /^You can’t have both\. “Defence at 3% of GDP now, not in 2030-31” is in your flagship policies\./,
    );
    expect(within(card).queryByRole('button', { name: /Swap them/ })).toBeNull();
    expect(within(card).getByRole('link', { name: /Change it/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
    // Nothing to price: there is no swap.
    expect(within(card).queryByText(/would (cost|save|raise)/)).toBeNull();
    // The 3% path itself is one line in the group, not a card.
    const held = group(/^Investment/).querySelector('.lever--held');
    expect(held?.textContent).toMatch(/In your flagship policies/);
    expect(held && within(held as HTMLElement).queryAllByRole('checkbox')).toHaveLength(0);
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

  it('has the bar say what changed, once the choice settles (Phase 25)', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const status = within(bar()).getByRole('status');
    // Mounted empty: nothing is said on arrival.
    expect(status).toBeEmptyDOMElement();
    fireEvent.click(
      within(policy('Put up the basic rate of income tax')).getByRole('radio', {
        name: 'Small 21%',
      }),
    );
    // Nothing while arrow keys may still be moving across the sizes; then only what changed, in
    // the bar's words.
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status.textContent).toMatch(/^Headroom, 2029-30: £\d+\.\dbn\./), {
      timeout: 3000,
    });
    expect(status.textContent).toMatch(/1 promise broken\.$/);
    expect(status.textContent).not.toMatch(/rules met/);
  });
});
