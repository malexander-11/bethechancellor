import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
/** A game that has agreed two priorities with the PM and reached fine-tuning, on today's estimate. */
const GAME = 'g=st.3_pr.safer-streets+defence&M=rate.0.75_rpi.0.5';

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
/** A tax decision's button, by its title: its name is the title, then where it stands. */
const decision = (title: string) => {
  const button = screen
    .getAllByRole('button')
    .find((b) => b.querySelector('.tune__decision-title')?.textContent === title);
  if (!button) throw new Error(`no decision “${title}”`);
  return button;
};
/** Where a tax decision stands, as its button says. */
const statusOf = (title: string) =>
  decision(title).querySelector('.tune__decision-status')?.textContent ?? '';
/** Open a tax decision (ADR-0035), and return the panel of its choices. */
const openDecision = (title: string) => {
  const button = decision(title);
  fireEvent.click(button);
  return document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement;
};
const search = () => new URLSearchParams(window.location.search);

describe('fine-tune tax and spend: the curated levers', () => {
  it('lays the tax screen out tax by tax, each tax the decisions about it, all closed', () => {
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
    // Eleven taxes, in order, each named plainly and with no count at rest (ADR-0035).
    const sections = screen
      .getAllByRole('region')
      .filter((r) => (r.getAttribute('aria-labelledby') ?? '').startsWith('tune-'));
    expect(sections.map((r) => r.querySelector('h2')?.textContent)).toEqual([
      'Income tax',
      'National Insurance',
      'VAT',
      'Capital gains tax',
      'Inheritance tax',
      'Wealth tax',
      'Council tax',
      'Stamp duty',
      'Business taxes',
      'Duties',
      'The tax gap',
    ]);
    // Twenty-six decisions, each a heading's button, all closed: no card on arrival.
    const toggles = [...container.querySelectorAll('.tune__decision-toggle')];
    expect(toggles).toHaveLength(26);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle.parentElement?.tagName).toBe('H3');
    }
    expect(container.querySelectorAll('.lever--curated')).toHaveLength(0);
    // What each holds, or where its one scale is planned to be: the user's VAT, for one.
    const vat = group(/^VAT$/);
    expect(
      within(vat)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Change the headline rate 20% as planned',
      'Make small changes 3 choices',
      'Remove an exemption 8 choices',
    ]);
    expect(statusOf('Change the rate')).toBe('40% as planned');
    expect(statusOf('Change business rates')).toBe('As planned');
    expect(statusOf('Chase more unpaid tax')).toBe('1 choice');
    // Stacked, not tabbed; one primary button; no slider anywhere.
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(container.querySelectorAll('.btn--primary')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Next: spending' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/spending\?/),
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
  });

  it('opens a decision in place, the focus kept, with every choice in it, and closes it again', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const button = decision('Change the rates');
    button.focus();
    const panel = openDecision('Change the rates');
    expect(document.activeElement).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    // Every choice about the rates, headed a level below the decision, each with its adviser's
    // line and no adviser's name: a rate that moves both ways is one scale under its plain name.
    expect(
      within(panel)
        .getAllByRole('heading', { level: 4 })
        .map((h) => h.textContent),
    ).toEqual([
      'The basic rate of income tax',
      'The higher rate of income tax',
      'The additional rate of income tax',
      'A new 50% income tax rate above £125,140',
    ]);
    const cards = panel.querySelectorAll('.lever--curated');
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.querySelector('.choice__advice')).not.toBeNull();
      expect(card.querySelector('.choice__advice .kicker')).toBeNull();
    }
    expect(
      within(policy('The basic rate of income tax'))
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['17%', '18%', '19%', '20% as planned', '21%', '22%', '25%']);
    // Nothing else opened with it, and closing it takes its cards away.
    expect(decision('Change allowances and thresholds')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
    expect(panel).not.toBeVisible();
    expect(panel.querySelectorAll('.lever--curated')).toHaveLength(0);
  });

  it('prices a tax each way before it moves, says what it does once moved, and the bar keeps score', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change the rates');
    const card = policy('The basic rate of income tax');
    const hints = () => [...card.querySelectorAll('.lever__hint-line')].map((l) => l.textContent);
    // At rest, on the plan: what the nearest level each way would do, on HMRC's own figure, and
    // what the headroom would then be, interest included (Phase 25), which the screen says once.
    // It is in the conditional, so it cannot read as money already in the Budget.
    expect(within(card).getByRole('radio', { name: '20% as planned' })).toBeChecked();
    expect(hints()).toEqual([
      expect.stringMatching(/^21%: would raise £\d\.\dbn · headroom would be £\d+\.\dbn$/),
      expect.stringMatching(/^19%: would cost £\d\.\dbn · headroom would be −?£\d+\.\dbn$/),
    ]);
    expect(
      screen.getByText(
        'Headroom also moves with the interest on borrowing, so it can move more than a tax raises.',
      ),
    ).toBeInTheDocument();
    // The resting tag names the promise, and the name opens what it covers (Phase 25).
    expect(card.querySelector('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    expect(within(card).getByRole('button', { name: 'Tax lock' })).toBeInTheDocument();
    expect(within(card).getByText(/^Big money;/)).toBeInTheDocument();
    const before = barFigure();
    fireEvent.click(within(card).getByRole('radio', { name: '22%' }));
    // Chosen: the prices give way to the lever's own effect line, the red line is crossed, the
    // decision and its tax say what they now raise, and the bar has moved.
    expect(hints()).toEqual([]);
    expect(within(card).getByRole('radio', { name: '22%' })).toBeChecked();
    expect(card.querySelector('.lever__value')?.textContent).toMatch(/^20% → 22%/);
    expect(
      within(card).getByText(/Day-to-day budget in 2029-30: raises £\d+\.\dbn/),
    ).toBeInTheDocument();
    expect(within(card).getByText('Breaks the manifesto: The tax lock')).toHaveClass('tag--warn');
    expect(group(/^Income tax 1 chosen · raises £\d+\.\dbn$/)).toBeInTheDocument();
    expect(statusOf('Change the rates')).toMatch(/^1 chosen · raises £\d+\.\dbn$/);
    expect(barFigure()).not.toBe(before);
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.2/));
    // 25% goes past HMRC's figure: the straight line is the game's arithmetic, and says so.
    fireEvent.click(within(card).getByRole('radio', { name: '25%' }));
    expect(
      within(card).getByText(/Beyond 2p the game scales it in a straight line/),
    ).toBeInTheDocument();
    // Down the same scale: a cut, with the cut's own adviser's line; the plan puts it back.
    fireEvent.click(within(card).getByRole('radio', { name: '19%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.-1/));
    expect(statusOf('Change the rates')).toMatch(/^1 chosen · costs £\d+\.\dbn$/);
    expect(within(card).getByText(/^Big money back;/)).toBeInTheDocument();
    expect(within(card).queryByText(/Choosing this replaces/)).toBeNull();
    fireEvent.click(within(card).getByRole('radio', { name: '20% as planned' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/itbr/));
    expect(statusOf('Change the rates')).toBe('4 choices');
    expect(hints()).toHaveLength(2);
  });

  it('says where a decision of one scale stands, and opens on arrival what a link chose', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=ct.1_iht.-40`);
    // Chosen before the screen opened: open, the choice in view; everything else closed.
    expect(decision('Change corporation tax')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change the rate')).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelectorAll('.tune__decision-toggle[aria-expanded="true"]')).toHaveLength(
      2,
    );
    expect(statusOf('Change corporation tax')).toMatch(/^26% · raises £\d\.\dbn$/);
    expect(statusOf('Change the rate')).toMatch(/^Abolish \(0%\) · costs £\d+\.\dbn$/);
    expect(group(/^Inheritance tax 1 chosen · costs £\d+\.\dbn$/)).toBeInTheDocument();
    // The user's VAT: the headline rate, one scale from 15% to 25%, the plan among them.
    const panel = openDecision('Change the headline rate');
    const vat = policy('The main rate of VAT');
    expect(within(panel).getAllByRole('heading', { level: 4 })).toHaveLength(1);
    expect(
      within(vat)
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['15%', '18%', '19%', '20% as planned', '21%', '22%', '25%']);
    expect(within(vat).getByRole('radio', { name: '20% as planned' })).toBeChecked();
    fireEvent.click(within(vat).getByRole('radio', { name: '22%' }));
    expect(statusOf('Change the headline rate')).toMatch(/^22% · raises £\d+\.\dbn$/);
    expect(group(/^VAT 1 chosen · raises £\d+\.\dbn$/)).toBeInTheDocument();
    await waitFor(() => expect(search().get('L')).toMatch(/vats\.2/));
  });

  it('says what a level no radio names is, with nothing checked', () => {
    // An old link's 23%: its decision open, the level named, and every radio clear.
    at(`/finetune/tax?${BASE}&${GAME}&L=vats.3`);
    const vat = policy('The main rate of VAT');
    expect(within(vat).getByText('Now 23%')).toBeInTheDocument();
    for (const radio of within(vat).getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(statusOf('Change the headline rate')).toMatch(/^23% · raises £\d+\.\dbn$/);
  });

  it('cuts the personal allowance or self-employed National Insurance, breaking no promise', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change allowances and thresholds');
    const allowance = policy('The personal allowance');
    expect(
      within(allowance)
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['£11,320', '£12,470', '£12,570 as planned', '£12,670', '£13,820']);
    // The cut leads: it raises money, and says so first.
    expect([...allowance.querySelectorAll('.lever__hint-line')].map((l) => l.textContent)).toEqual([
      expect.stringMatching(/^£12,470: would raise £1\.\dbn · headroom would be/),
      expect.stringMatching(/^£12,670: would cost £1\.\dbn · headroom would be/),
    ]);
    expect(within(allowance).getByText(/^Most taxpayers pay more;/)).toBeInTheDocument();
    fireEvent.click(within(allowance).getByRole('radio', { name: '£11,320' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itpa\.-1250/));
    expect(within(allowance).queryByText(/Breaks the manifesto/)).toBeNull();
    expect(within(allowance).queryByText(/Strains the manifesto/)).toBeNull();
    // Class 4 can come down to 2%; only a rise breaks the tax lock.
    openDecision('Change what the self-employed pay');
    const class4 = policy('National Insurance for the self-employed');
    expect(
      within(class4)
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['2%', '4%', '5%', '6% as planned', '7%', '8%', '10%']);
    fireEvent.click(within(class4).getByRole('radio', { name: '5%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/nic4\.-1/));
    expect(within(class4).getByText(/^Self-employed workers keep more/)).toBeInTheDocument();
    expect(within(class4).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
    fireEvent.click(within(class4).getByRole('radio', { name: '7%' }));
    expect(within(class4).getByText('Breaks the manifesto: The tax lock')).toHaveClass('tag--warn');
  });

  it('marks employer National Insurance amber, not red: the tax lock strained', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change what employers pay');
    const card = policy('Employer National Insurance');
    expect(
      within(card).getByText(/^16%: would raise £\d+\.\dbn · headroom would be/),
    ).toBeInTheDocument();
    expect(card.querySelector('.tag--manifesto')?.textContent).toMatch(
      /^Tax lock: keeps its words, strains its spirit/,
    );
    fireEvent.click(within(card).getByRole('radio', { name: '16%' }));
    expect(within(card).getByText('Strains the manifesto: The tax lock')).toHaveClass('tag--amber');
    expect(within(card).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
  });

  it('keeps a decision open while it is chosen in, and open on the next visit', () => {
    const first = at(`/finetune/tax?${BASE}&${GAME}`);
    const panel = openDecision('Tax drink, tobacco and gambling');
    const alcohol = cardOf(within(panel).getByRole('heading', { name: 'Alcohol duty' }));
    fireEvent.click(within(alcohol).getByRole('radio', { name: '5% more' }));
    // Still open, and the card where it was: it never jumps from under the pointer.
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    expect(policy('Alcohol duty')).toBe(alcohol);
    expect(statusOf('Tax drink, tobacco and gambling')).toMatch(/^1 chosen · raises £0\.\dbn$/);
    expect(group(/^Duties 1 chosen · raises £0\.\dbn$/)).toBeInTheDocument();
    // Closed and opened again, the choice is as it was.
    fireEvent.click(decision('Tax drink, tobacco and gambling'));
    openDecision('Tax drink, tobacco and gambling');
    expect(within(policy('Alcohol duty')).getByRole('radio', { name: '5% more' })).toBeChecked();
    first.unmount();
    // The next visit finds the decision open, the scale where it was, and every other decision
    // closed.
    at(`/finetune/tax?${BASE}&${GAME}&L=alc.5`);
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    const again = policy('Alcohol duty');
    expect(within(again).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(again).getByRole('radio', { name: '5% less' })).not.toBeChecked();
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'false');
  });

  it('warns when two levers overlap: the April 2027 freeze against a fuel duty cut', () => {
    at(`/finetune/tax?${BASE}&g=st.3_pr.cost-of-living&M=rate.0.75_rpi.0.5&L=fuel.-10`);
    // The cut is the cost-of-living flagship's own, so its decision is open on arrival and fuel
    // duty is one line in it, with the way back to that flagship, not a card that could undo it.
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'true');
    const held = group(/^Duties/).querySelector('.lever--held');
    expect(held?.querySelector('.lever__held')?.textContent).toMatch(/^Cut fuel duty by 10%/);
    // The freeze a Chancellor faces this autumn is on show, costs money (Phase 25), and says it
    // moves the same duty as the cut.
    const freeze = cardOf(screen.getByRole('checkbox', { name: 'Freeze fuel duty in April 2027' }));
    expect(
      within(freeze).getByText(/^Warning: Overlaps with Fuel duty: Both change fuel duty rates/),
    ).toHaveClass('choice__overlap--warn');
    expect(
      within(freeze).getByText(/^If you switch it on: would cost £0\.\dbn · headroom would be/),
    ).toBeInTheDocument();
  });

  it('reads a relief cost as the most it could raise, and says why in plain words', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change what employers pay');
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
    at(`/finetune/tax?${BASE}&${GAME}&L=cgtexit.1`);
    // The charge on leavers was chosen before the screen opened, so its decision is open.
    expect(decision('Tax gains that go untaxed')).toHaveAttribute('aria-expanded', 'true');
    const death = screen.getByRole('checkbox', { name: 'Tax capital gains when someone dies' });
    const card = cardOf(death);
    expect(death).toHaveAttribute('aria-disabled', 'true');
    expect(death).toHaveAccessibleDescription(
      /You can’t have both\. Untick “Charge capital gains tax on people who leave the UK” to choose this\./,
    );
    expect(card.className).toMatch(/lever--blocked/);
    // Priced as the swap it offers, never as both at once.
    expect(
      within(card).getByText(/^If you swap them: would raise £\d+\.\dbn · headroom would be/),
    ).toBeInTheDocument();
    fireEvent.click(death);
    expect(search().get('L')).toMatch(/cgtexit\.1/);
    expect(search().get('L') ?? '').not.toMatch(/cgtdth/);
    fireEvent.click(within(card).getByRole('button', { name: /Swap them/ }));
    await waitFor(() => expect(search().get('L')).toMatch(/cgtdth\.1/));
    expect(search().get('L') ?? '').not.toMatch(/cgtexit/);
    expect(
      screen.getByRole('checkbox', { name: 'Charge capital gains tax on people who leave the UK' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('prices a blocked scale as the swap it offers, and swaps in its nearest level', async () => {
    // The new 50% rate and the additional rate both set the top rate: one or the other.
    at(`/finetune/tax?${BASE}&${GAME}&L=it50.1`);
    const card = policy('The additional rate of income tax');
    expect(card.className).toMatch(/lever--blocked/);
    for (const radio of within(card).getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-disabled', 'true');
    }
    // One price, the swap's, not one a way.
    expect([...card.querySelectorAll('.lever__hint-line')].map((l) => l.textContent)).toEqual([
      expect.stringMatching(/^If you swap them: would (raise|cost) £\d\.\dbn · headroom would be/),
    ]);
    fireEvent.click(within(card).getByRole('button', { name: /Swap them/ }));
    await waitFor(() => expect(search().get('L')).toMatch(/itar\.1/));
    expect(search().get('L') ?? '').not.toMatch(/it50/);
    expect(
      within(policy('The additional rate of income tax')).getByRole('radio', { name: '46%' }),
    ).toBeChecked();
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
    const past = at(`/finetune/spending?${BASE}&g=st.3_pr.nhs&M=rate.0.75_rpi.0.5&L=dhsc.5`);
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
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10_nicer.2`);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/finetune\/tax\?/),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Next: deliver the Budget' }));
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    await waitFor(() => {
      expect(search().get('g')).toBe('st.4_pr.safer-streets+defence');
      expect(search().get('L')).toMatch(/nicer\.2/);
      expect(search().get('S')).toBeNull();
    });
  });

  it('sends the old and odd addresses to the right screen, and a link with no game to the briefing', () => {
    const old = at(`/budget/afford?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    old.unmount();
    const bare = at(`/finetune?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    bare.unmount();
    const odd = at(`/finetune/nothing?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    odd.unmount();
    // The desk's spending screen is step 4's now (Phase 26), and there is no link to a desk.
    const desk = at(`/budget/spending?${BASE}&${GAME}`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Every (tax|spending) lever/ })).toBeNull();
    desk.unmount();
    // With no game there is no sandbox: the briefing, and the link's measures wait for the game.
    const sandbox = at(`/finetune/spending?${BASE}&L=dfe.-2`);
    expect(h1('Your briefing')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'About this link' })).toHaveTextContent(
      'This link’s measures will be in your Budget when you start.',
    );
    sandbox.unmount();
    // A game that has not yet agreed its priorities is sent back to them.
    at(`/finetune/tax?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
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
    // Mounted empty: nothing is said on arrival, nor on opening a decision.
    expect(status).toBeEmptyDOMElement();
    openDecision('Change the rates');
    fireEvent.click(
      within(policy('The basic rate of income tax')).getByRole('radio', { name: '21%' }),
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

/** The titles of the cards on show, in order: policies and flagship lines alike. */
const cardTitles = () =>
  [...document.querySelectorAll('.lever--curated .lever__title')].map((h) => h.textContent ?? '');
const modeLine = () => document.querySelector('.mode-line') as HTMLElement;

describe('fine-tune in basic mode: the advisers’ best ideas (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('shows the Director of Tax’s eight picks and nothing else, as the advisers’ shortlist', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    expect(
      screen.getByText('Your Director of Tax’s best ideas. Watch your headroom move.'),
    ).toBeInTheDocument();
    expect(modeLine().textContent).toMatch(/^A shortlist\./);
    expect(document.querySelector('.badge')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'See every idea (all 87 tax policies)' }),
    ).toBeInTheDocument();
    expect(cardTitles()).toEqual([
      'Give everyone the same 30% pension tax relief',
      'Put up employer National Insurance',
      'Charge employer National Insurance on pension contributions',
      'Keep VAT off electricity after March 2027',
      'Tax capital gains when someone dies',
      'End the extra inheritance tax allowance for family homes',
      'Double council tax on the biggest homes (bands G and H)',
      'Put gambling duties up again',
    ]);
    // Seven taxes, the four with no pick left out; no decisions, no folds, and no count at rest.
    expect([...document.querySelectorAll('section.tune h2')].map((h) => h.textContent)).toEqual([
      'Income tax',
      'National Insurance',
      'VAT',
      'Capital gains tax',
      'Inheritance tax',
      'Council tax',
      'Duties',
    ]);
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    expect(screen.queryByText(/more polic(y|ies)$/)).toBeNull();
    // A card is headed a level below its tax, as there is no decision between them.
    expect(
      screen.getByRole('heading', { level: 3, name: 'Put gambling duties up again' }),
    ).toBeInTheDocument();
    // The one way on show, as a scale from where the tax is planned to be (ADR-0035).
    expect(
      within(policy('Put up employer National Insurance'))
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['15% as planned', '16%', '17%', '18%']);
    // Still one primary button, and the cards still price themselves.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    expect(
      within(policy('Put gambling duties up again')).getByText(/^If you switch it on: would raise/),
    ).toBeInTheDocument();
    // Chosen, a group says so as it does in advanced mode.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Put gambling duties up again' }));
    expect(group(/^Duties 1 chosen · raises £\d\.\dbn/)).toBeInTheDocument();
  });

  it('swaps to every idea and back with one button, which keeps the focus', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const button = screen.getByRole('button', { name: /^See every idea/ });
    button.focus();
    fireEvent.click(button);
    // The same button, still focused, now offering the shortlist back; the screen is advanced
    // mode's, exactly.
    expect(screen.getByRole('button', { name: 'Show only the best ideas' })).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(within(modeLine()).getByRole('status')).toHaveTextContent('Every idea is on show.');
    expect(modeLine().textContent).not.toMatch(/A shortlist/);
    // Advanced mode's screen: every tax, its decisions all closed.
    expect(document.querySelectorAll('.lever--curated')).toHaveLength(0);
    expect(
      [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
    ).toEqual(Array(26).fill('false'));
    expect(group(/^Wealth tax$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Raise or cut any tax. Watch your headroom move. Your Director of Tax’s view is on each lever.',
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('advanced');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /^See every idea/ })).toBe(button);
    expect(within(modeLine()).getByRole('status')).toHaveTextContent(
      'Only the best ideas are on show.',
    );
    expect(cardTitles()).toHaveLength(8);
    expect(window.localStorage.getItem('btc.mode.v1')).toBe('basic');
  });

  it('never hides what was chosen: a policy picked in advanced mode stays on show in basic', () => {
    window.localStorage.setItem('btc.mode.v1', 'advanced');
    at(`/finetune/tax?${BASE}&${GAME}`);
    const panel = openDecision('Tax drink, tobacco and gambling');
    const alcohol = cardOf(within(panel).getByRole('heading', { name: 'Alcohol duty' }));
    fireEvent.click(within(alcohol).getByRole('radio', { name: '5% more' }));
    // The way back to the shortlist is the screen's own button (the footer's switch is withdrawn
    // for now, ADR-0032).
    fireEvent.click(screen.getByRole('button', { name: 'Show only the best ideas' }));
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    // In basic mode, the way it was chosen, as a scale from the plan.
    expect(cardTitles()).toContain('Put up alcohol duty');
    expect(
      within(policy('Put up alcohol duty')).getByRole('radio', { name: '5% more' }),
    ).toBeChecked();
    expect(cardTitles()).toHaveLength(9);
    // And back: the decision holding it opens, as it would on a visit that found it chosen.
    fireEvent.click(screen.getByRole('button', { name: /^See every idea/ }));
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a lever a link chose, and keeps it on show after Undo until the next visit', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=alc.5`);
    const alcohol = policy('Put up alcohol duty');
    expect(within(alcohol).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(group(/^Duties 1 chosen · raises/)).toBeInTheDocument();
    fireEvent.click(within(alcohol).getByRole('button', { name: 'Undo for Put up alcohol duty' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/alc/));
    // Still on show: a card never vanishes from under the pointer.
    expect(policy('Put up alcohol duty')).toBe(alcohol);
    expect(group(/^Duties$/)).toBeInTheDocument();
  });

  it('shows the flagships’ lines and the defence plan’s gap, which the briefing puts on the desk', () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    expect(
      screen.getByText(
        'Your Director of Public Spending’s best ideas. A top-up costs what a trim saves.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'See every idea (all 46 spending policies)' }),
    ).toBeInTheDocument();
    // The prisons flagship holds its lever: its line shows in basic mode as in advanced.
    const prisons = cardOf(screen.getByRole('heading', { name: 'Prisons and courts' }));
    expect(prisons.querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    expect(cardTitles()).toEqual([
      'Spend more on health and social care',
      'Spend more on schools and education',
      'Prisons and courts',
      'Spend more on public investment',
      'Fund the defence plan’s gap',
      'More council and social rent homes',
      'Raise housing benefit to match local rents',
      'Go ahead with the 2025 cuts to PIP',
      'Limit winter fuel payments to pensioners on pension credit',
    ]);
    // The screen's notes stay: how long the settlements run, and whose budgets these are.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
  });
});
