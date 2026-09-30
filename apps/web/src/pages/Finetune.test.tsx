import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { INVESTMENT_NOTE, RELIEF_NOTE } from '../components/LeverRow';

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
/** The row a control sits in (ADR-0037). */
const rowOf = (control: HTMLElement) => control.closest('.tune__row') as HTMLElement;
/** A scale's row, by what the row is called: its levels are one group of radios under that name. */
const scale = (name: string) => rowOf(screen.getByRole('radiogroup', { name }));
/** A tick's row, by what the row is called. */
const tickRow = (name: string) => rowOf(screen.getByRole('checkbox', { name }));
/** Any row, by what it is called: a flagship's row has no control to find it by. */
const namedRow = (name: string) => {
  const found = [...document.querySelectorAll('.tune__row-name')].find(
    (n) => n.textContent === name,
  );
  if (!found) throw new Error(`no row “${name}”`);
  return found.closest('.tune__row') as HTMLElement;
};
/** A scale's levels, as its radios' labels read. */
const levelsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('radio')
    .map((r) => r.closest('label')?.textContent);
/** What a row says at rest: what choosing would do. */
const priceOf = (row: HTMLElement) => row.querySelector('.tune__row-price')?.textContent ?? '';
/** What a row says once chosen: what it does. */
const effectOf = (row: HTMLElement) => row.querySelector('.tune__row-effect')?.textContent ?? '';
/** A decision's button, by its title: its name is the title, then where it stands. */
const decision = (title: string) => {
  const button = screen
    .getAllByRole('button')
    .find((b) => b.querySelector('.tune__decision-title')?.textContent === title);
  if (!button) throw new Error(`no decision “${title}”`);
  return button;
};
/** Where a decision stands, as its button says. */
const statusOf = (title: string) =>
  decision(title).querySelector('.tune__decision-status')?.textContent ?? '';
/** The panel a decision opens into. */
const panelOf = (title: string) =>
  document.getElementById(decision(title).getAttribute('aria-controls') ?? '') as HTMLElement;
/** Open a decision (ADR-0035), and return the panel of its one card. */
const openDecision = (title: string) => {
  fireEvent.click(decision(title));
  return panelOf(title);
};
/** The rows on show, by name, in order: flagships' rows among them. */
const rowNames = (scope: ParentNode = document) =>
  [...scope.querySelectorAll('.tune__row-name')].map((n) => n.textContent ?? '');
const search = () => new URLSearchParams(window.location.search);

describe('fine-tune tax and spend: one card a decision', () => {
  it('lays the tax screen out tax by tax, each tax the decisions about it, all closed', () => {
    const { container } = at(`/finetune/tax?${BASE}&${GAME}`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    // The lead names the adviser once; the adviser speaks on a row once it is chosen (ADR-0037).
    expect(
      screen.getByText(
        'Raise or cut any tax. Watch your headroom move. Your Director of Tax’s view shows once you choose.',
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
    // Twenty-six decisions, each a heading's button, all closed: no row on arrival.
    const toggles = [...container.querySelectorAll('.tune__decision-toggle')];
    expect(toggles).toHaveLength(26);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle.parentElement?.tagName).toBe('H3');
    }
    expect(container.querySelectorAll('.tune__row')).toHaveLength(0);
    // What each holds, or where its one scale is planned to be: the user's VAT, for one.
    expect(
      within(group(/^VAT$/))
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

  it('opens a decision into one card, a row a choice, the focus kept, and closes it again', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const button = decision('Change the rates');
    button.focus();
    const panel = openDecision('Change the rates');
    expect(document.activeElement).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    // One card: each choice a row under its short name, with no heading of its own, no headroom
    // and no adviser's line until it is chosen; everything else about them in one fold.
    expect(panel.querySelectorAll('.tune__card')).toHaveLength(1);
    expect(rowNames(panel)).toEqual([
      'Basic rate',
      'Higher rate',
      'Additional rate',
      'A new 50% rate above £125,140',
    ]);
    // The only headings are the fold's, one a row: a row has none of its own.
    const headings = within(panel).getAllByRole('heading', { level: 4 });
    expect(headings.map((h) => h.textContent)).toEqual(rowNames(panel));
    for (const h of headings) expect(h.closest('details')).not.toBeNull();
    expect(panel.querySelectorAll('.choice__advice')).toHaveLength(0);
    const rows = [...panel.querySelectorAll('.tune__row')].map((r) => r.textContent).join(' ');
    expect(rows).not.toMatch(/headroom/i);
    const fold = within(panel).getByText('More about these').closest('details');
    expect(fold).not.toHaveAttribute('open');
    // A rate that moves both ways is one scale, the plan among its levels; a new rate is a tick.
    expect(levelsOf(scale('Basic rate'))).toEqual([
      '17%',
      '18%',
      '19%',
      '20% as planned',
      '21%',
      '22%',
      '25%',
    ]);
    expect(
      screen.getByRole('checkbox', { name: 'A new 50% rate above £125,140' }),
    ).not.toBeChecked();
    // The fold holds what the rows leave out: each lever under its name here, and what it assumes.
    fireEvent.click(within(panel).getByText('More about these'));
    expect(fold).toHaveAttribute('open');
    expect(
      within(panel).getByRole('heading', { level: 4, name: 'Basic rate' }),
    ).toBeInTheDocument();
    expect(within(panel).getAllByText('What this assumes').length).toBeGreaterThan(0);
    // Nothing else opened with it, and closing it takes its card away.
    expect(decision('Change allowances and thresholds')).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
    expect(panel).not.toBeVisible();
    expect(panel.querySelectorAll('.tune__row')).toHaveLength(0);
  });

  it('prices a tax each way before it moves, says what it does once moved, and the bar keeps score', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change the rates');
    const row = scale('Basic rate');
    // At rest, on the plan: what the nearest level each way would do, on HMRC's own figure, in the
    // conditional and with no headroom, which the bar keeps; the screen says once that headroom
    // moves by the interest too (Phase 25).
    expect(within(row).getByRole('radio', { name: '20% as planned' })).toBeChecked();
    expect(priceOf(row)).toMatch(/^21% would raise £\d\.\dbn · 19% would cost £\d\.\dbn$/);
    expect(
      screen.getByText(
        'Headroom also moves with the interest on borrowing, so it can move more than a tax raises.',
      ),
    ).toBeInTheDocument();
    // The resting tag names the promise, and the name opens what it covers (Phase 25).
    expect(row.querySelector('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    expect(within(row).getByRole('button', { name: 'Tax lock' })).toBeInTheDocument();
    expect(within(row).queryByText(/^Big money;/)).toBeNull();
    const before = barFigure();
    fireEvent.click(within(row).getByRole('radio', { name: '22%' }));
    // Chosen: the prices give way to what it does, the adviser speaks, the red line is crossed,
    // the decision and its tax say what they now raise, and the bar has moved.
    expect(priceOf(row)).toBe('');
    expect(within(row).getByRole('radio', { name: '22%' })).toBeChecked();
    expect(effectOf(row)).toMatch(/^raises £\d+\.\dbn in 2029-30$/);
    expect(within(row).getByText(/^Big money;/)).toBeInTheDocument();
    expect(within(row).getByText('Breaks the manifesto: The tax lock')).toHaveClass('tag--warn');
    expect(group(/^Income tax 1 chosen · raises £\d+\.\dbn$/)).toBeInTheDocument();
    expect(statusOf('Change the rates')).toMatch(/^1 chosen · raises £\d+\.\dbn$/);
    expect(barFigure()).not.toBe(before);
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.2/));
    // 25% goes past HMRC's figure: the straight line is the game's arithmetic, and says so.
    fireEvent.click(within(row).getByRole('radio', { name: '25%' }));
    expect(
      within(row).getByText(/Beyond 2p the game scales it in a straight line/),
    ).toBeInTheDocument();
    // Down the same scale: a cut, with the cut's own adviser's line; the plan puts it back.
    fireEvent.click(within(row).getByRole('radio', { name: '19%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.-1/));
    expect(statusOf('Change the rates')).toMatch(/^1 chosen · costs £\d+\.\dbn$/);
    expect(within(row).getByText(/^Big money back;/)).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('radio', { name: '20% as planned' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/itbr/));
    expect(statusOf('Change the rates')).toBe('4 choices');
    expect(priceOf(row)).toMatch(/^21% would raise/);
    // Undo, once chosen, does what the plan does.
    fireEvent.click(within(row).getByRole('radio', { name: '21%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itbr\.1/));
    fireEvent.click(within(row).getByRole('button', { name: 'Undo for Basic rate' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/itbr/));
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
    expect(rowNames(panel)).toEqual(['The main rate of VAT']);
    expect(within(panel).getByText('More about this')).toBeInTheDocument();
    const vat = scale('The main rate of VAT');
    expect(levelsOf(vat)).toEqual(['15%', '18%', '19%', '20% as planned', '21%', '22%', '25%']);
    expect(within(vat).getByRole('radio', { name: '20% as planned' })).toBeChecked();
    fireEvent.click(within(vat).getByRole('radio', { name: '22%' }));
    expect(statusOf('Change the headline rate')).toMatch(/^22% · raises £\d+\.\dbn$/);
    expect(group(/^VAT 1 chosen · raises £\d+\.\dbn$/)).toBeInTheDocument();
    await waitFor(() => expect(search().get('L')).toMatch(/vats\.2/));
  });

  it('says what a level no radio names is, with nothing checked', () => {
    // An old link's 23%: its decision open, the level named, and every radio clear.
    at(`/finetune/tax?${BASE}&${GAME}&L=vats.3`);
    const vat = scale('The main rate of VAT');
    expect(within(vat).getByText('Now 23%')).toBeInTheDocument();
    for (const radio of within(vat).getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(statusOf('Change the headline rate')).toMatch(/^23% · raises £\d+\.\dbn$/);
  });

  it('cuts the personal allowance or self-employed National Insurance, breaking no promise', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Change allowances and thresholds');
    const allowance = scale('Personal allowance');
    expect(levelsOf(allowance)).toEqual([
      '£11,320',
      '£12,470',
      '£12,570 as planned',
      '£12,670',
      '£13,820',
    ]);
    // The cut leads: it raises money, and says so first.
    expect(priceOf(allowance)).toMatch(
      /^£12,470 would raise £1\.\dbn · £12,670 would cost £1\.\dbn$/,
    );
    fireEvent.click(within(allowance).getByRole('radio', { name: '£11,320' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itpa\.-1250/));
    expect(within(allowance).getByText(/^Most taxpayers pay more;/)).toBeInTheDocument();
    expect(within(allowance).queryByText(/Breaks the manifesto/)).toBeNull();
    expect(within(allowance).queryByText(/Strains the manifesto/)).toBeNull();
    // Class 4 can come down to 2%; only a rise breaks the tax lock.
    openDecision('Change what the self-employed pay');
    const class4 = scale('Main rate');
    expect(levelsOf(class4)).toEqual(['2%', '4%', '5%', '6% as planned', '7%', '8%', '10%']);
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
    const row = scale('Employer rate');
    expect(priceOf(row)).toMatch(/^16% would raise £\d+\.\dbn · 14% would cost £\d+\.\dbn$/);
    expect(row.querySelector('.tag--manifesto')?.textContent).toMatch(
      /^Tax lock: keeps its words, strains its spirit/,
    );
    fireEvent.click(within(row).getByRole('radio', { name: '16%' }));
    expect(within(row).getByText('Strains the manifesto: The tax lock')).toHaveClass('tag--amber');
    expect(within(row).queryByText('Breaks the manifesto: The tax lock')).toBeNull();
  });

  it('keeps a decision open while it is chosen in, and open on the next visit', () => {
    const first = at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Tax drink, tobacco and gambling');
    const alcohol = scale('Alcohol');
    fireEvent.click(within(alcohol).getByRole('radio', { name: '5% more' }));
    // Still open, and the row where it was: it never jumps from under the pointer.
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    expect(scale('Alcohol')).toBe(alcohol);
    expect(statusOf('Tax drink, tobacco and gambling')).toMatch(/^1 chosen · raises £0\.\dbn$/);
    expect(group(/^Duties 1 chosen · raises £0\.\dbn$/)).toBeInTheDocument();
    // Closed and opened again, the choice is as it was.
    fireEvent.click(decision('Tax drink, tobacco and gambling'));
    openDecision('Tax drink, tobacco and gambling');
    expect(within(scale('Alcohol')).getByRole('radio', { name: '5% more' })).toBeChecked();
    first.unmount();
    // The next visit finds the decision open, the scale where it was, and every other decision
    // closed.
    at(`/finetune/tax?${BASE}&${GAME}&L=alc.5`);
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    const again = scale('Alcohol');
    expect(within(again).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(again).getByRole('radio', { name: '5% less' })).not.toBeChecked();
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'false');
  });

  it('warns when two levers overlap: the April 2027 freeze against a fuel duty cut', () => {
    at(`/finetune/tax?${BASE}&g=st.3_pr.cost-of-living&M=rate.0.75_rpi.0.5&L=fuel.-10`);
    // The cut is the cost-of-living flagship's own, so its decision is open on arrival and fuel
    // duty is a row naming that flagship, with the way back to it, not a scale that could undo it.
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'true');
    const held = namedRow('Fuel duty');
    expect(held).toHaveClass('tune__row--held');
    expect(held.querySelector('.lever__held')?.textContent).toMatch(/^Cut fuel duty by 10%/);
    expect(within(held).queryAllByRole('radio')).toHaveLength(0);
    // The freeze a Chancellor faces this autumn is on show, costs money (Phase 25), and warns at
    // once that it moves the same duty as the cut.
    const freeze = tickRow('Freeze it in April 2027');
    expect(
      within(freeze).getByText(/^Warning: Overlaps with Fuel duty: Both change fuel duty rates/),
    ).toHaveClass('choice__overlap--warn');
    expect(priceOf(freeze)).toMatch(/^would cost £0\.\dbn$/);
  });

  it('reads a relief cost as the most it could raise, and says why once a card', () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    const panel = openDecision('Change what employers pay');
    const pensions = tickRow('Charge it on pension contributions');
    expect(priceOf(pensions)).toMatch(/^would raise at most £\d+\.\dbn$/);
    // Said once, at the top of the card, not on the row.
    expect(within(panel).getAllByText(RELIEF_NOTE)).toHaveLength(1);
    expect(within(pensions).queryByText(RELIEF_NOTE)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Charge it on pension contributions' }));
    expect(effectOf(pensions)).toMatch(/^raises at most £\d+\.\dbn in 2029-30$/);
    // A card with no relief in it says nothing of the kind.
    expect(within(openDecision('Change the headline rate')).queryByText(RELIEF_NOTE)).toBeNull();
  });

  it('makes two ticks that contradict each other one choice, As planned first (ADR-0036)', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=cgtexit.1`);
    // The charge on leavers was chosen before the screen opened, so its decision is open.
    expect(decision('Tax gains that go untaxed')).toHaveAttribute('aria-expanded', 'true');
    const set = screen.getByRole('group', { name: 'Capital gains that go untaxed' });
    const radio = (name: string) => within(set).getByRole('radio', { name });
    const death = radio('When someone dies');
    expect(within(set).getAllByRole('radio')).toHaveLength(3);
    expect(radio('When someone leaves the UK')).toBeChecked();
    expect(radio('As planned')).not.toBeChecked();
    expect(death).not.toBeChecked();
    // One group, so the arrow keys move between them as they do along a scale.
    const names = within(set)
      .getAllByRole('radio')
      .map((r) => r.getAttribute('name'));
    expect(new Set(names).size).toBe(1);
    // Nothing is blocked and nothing asks to be unticked: the other radio is the swap, priced as one.
    const row = rowOf(death);
    expect(death).not.toHaveAttribute('aria-disabled');
    expect(row).not.toHaveClass('tune__row--blocked');
    expect(within(row).queryByText(/can’t have both|takes out|Counted twice/)).toBeNull();
    expect(priceOf(row)).toMatch(/^would raise £\d+\.\dbn instead$/);
    fireEvent.click(death);
    await waitFor(() => expect(search().get('L')).toMatch(/cgtdth\.1/));
    expect(search().get('L') ?? '').not.toMatch(/cgtexit/);
    expect(radio('When someone dies')).toBeChecked();
    expect(statusOf('Tax gains that go untaxed')).toMatch(/^1 chosen · raises £\d\.\dbn$/);
    // As planned puts both back.
    fireEvent.click(radio('As planned'));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/cgtdth|cgtexit/));
    expect(statusOf('Tax gains that go untaxed')).toBe('3 choices');
    // Capital gains on main homes is no part of the choice: a tick of its own beside it.
    expect(screen.getByRole('checkbox', { name: 'On main homes' })).toBeInTheDocument();
  });

  it('makes the wealth tax, pension relief and the rates on dividends one choice each', async () => {
    at(`/finetune/tax?${BASE}&${GAME}`);
    // The wealth tax is its card's whole question: the set's name is heard, not shown again.
    const wealthPanel = openDecision('Tax wealth above £10 million');
    const wealth = within(wealthPanel).getByRole('group', { name: 'The wealth tax' });
    expect(within(wealth).getByText('The wealth tax')).toHaveClass('sr-only');
    expect(within(wealth).getByRole('radio', { name: 'As planned' })).toBeChecked();
    fireEvent.click(within(wealth).getByRole('radio', { name: '1% a year' }));
    await waitFor(() => expect(search().get('L')).toMatch(/(^|_)wealth\.1/));
    fireEvent.click(within(wealth).getByRole('radio', { name: '2% a year' }));
    await waitFor(() => expect(search().get('L')).toMatch(/wealth2\.1/));
    expect(search().get('L') ?? '').not.toMatch(/(^|_)wealth\.1/);
    expect(statusOf('Tax wealth above £10 million')).toMatch(/^1 chosen/);

    const pensions = openDecision('Change pension tax relief');
    const rate = within(pensions).getByRole('group', { name: 'The rate of pension tax relief' });
    expect(within(rate).getByText('The rate of pension tax relief')).not.toHaveClass('sr-only');
    fireEvent.click(within(rate).getByRole('radio', { name: '30% for everyone' }));
    // The cap on the lump sum is no part of the choice: a tick beside it, chosen with either.
    fireEvent.click(within(pensions).getByRole('checkbox', { name: 'Cap the tax-free lump sum' }));
    await waitFor(() => expect(search().get('L')).toMatch(/pens30\.1/));
    fireEvent.click(within(rate).getByRole('radio', { name: 'The basic rate only' }));
    await waitFor(() => expect(search().get('L')).toMatch(/pens20\.1/));
    expect(search().get('L')).toMatch(/pslump\.1/);
    expect(search().get('L') ?? '').not.toMatch(/pens30/);

    const income = openDecision('Tax on dividends, savings and rent');
    const rates = within(income).getByRole('group', {
      name: 'The rates on dividends, savings and rent',
    });
    fireEvent.click(within(rates).getByRole('radio', { name: 'Undo last year’s rises' }));
    await waitFor(() => expect(search().get('L')).toMatch(/rvinv\.1/));
    fireEvent.click(within(rates).getByRole('radio', { name: 'Another 2p' }));
    await waitFor(() => expect(search().get('L')).toMatch(/iinc2\.1/));
    expect(search().get('L') ?? '').not.toMatch(/rvinv/);
  });

  it('checks the first of a choice an old link carries two of, and warns on both', () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=wealth.1_wealth2.1`);
    const set = screen.getByRole('group', { name: 'The wealth tax' });
    expect(within(set).getByRole('radio', { name: '1% a year' })).toBeChecked();
    expect(within(set).getByRole('radio', { name: '2% a year' })).not.toBeChecked();
    expect(within(set).getAllByText(/^Warning: Counted twice with/)).toHaveLength(2);
  });

  it('says first what the 1% rate on zero-rated goods would take out, and takes it out', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=vatfood.1_vatbook.1`);
    const one = screen.getByRole('checkbox', { name: '1% on everything now zero-rated' });
    const row = rowOf(one);
    // It still moves, and says first what it would take out, by the names the card gives them:
    // they are beside it, so why waits in the card's fold; its price counts them as gone.
    expect(one).not.toHaveAttribute('aria-disabled');
    expect(row).not.toHaveClass('tune__row--blocked');
    expect(one).toHaveAccessibleDescription(
      /^Choosing this takes out “Food” and “Books, newspapers and magazines”\. would (raise|cost) £\d+\.\dbn instead$/,
    );
    expect(within(row).queryByText(/Counted twice|Overlaps with/)).toBeNull();
    const panel = panelOf('Remove an exemption');
    fireEvent.click(within(panel).getByText('More about these'));
    expect(
      within(panel).getByText(
        /^Charge VAT on food: The 1% rate already covers food, so 20% on food too would count it twice\./,
      ),
    ).toBeInTheDocument();
    fireEvent.click(one);
    await waitFor(() => expect(search().get('L')).toMatch(/vat1z\.1/));
    expect(search().get('L') ?? '').not.toMatch(/vatfood|vatbook/);
    // Now the exemptions say it the other way.
    expect(
      within(tickRow('Food')).getByText(
        /^Choosing this takes out “1% on everything now zero-rated”\.$/,
      ),
    ).toBeInTheDocument();
  });

  it('says why when what a choice would take out is in another decision', () => {
    // Gas off VAT and full VAT on home energy pull the same duty opposite ways from two decisions:
    // the row names the other plainly, as it is not in view, and says why.
    at(`/finetune/tax?${BASE}&${GAME}&L=vatnrg.1`);
    openDecision('Make small changes');
    expect(
      screen.getByRole('checkbox', { name: 'Take VAT off gas too' }),
    ).toHaveAccessibleDescription(
      /^Choosing this takes out “Charge full VAT on home energy”\. They pull opposite ways.+ would (raise|cost) £\d+\.\dbn instead$/,
    );
  });

  it('says first what a level on a scale would take out, priced a way each with it gone', async () => {
    // The new 50% rate and the additional rate both set the top rate: choosing one takes the other
    // out.
    at(`/finetune/tax?${BASE}&${GAME}&L=it50.1`);
    const row = scale('Additional rate');
    expect(row).not.toHaveClass('tune__row--blocked');
    expect(
      within(row).getByText(/^Choosing a level here takes out “A new 50% rate above £125,140”\.$/),
    ).toBeInTheDocument();
    for (const radio of within(row).getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('aria-disabled');
    }
    expect(priceOf(row)).toMatch(
      /^Instead: 46% would (raise|cost) £\d\.\dbn · 44% would (raise|cost) £\d\.\dbn$/,
    );
    fireEvent.click(within(row).getByRole('radio', { name: '46%' }));
    await waitFor(() => expect(search().get('L')).toMatch(/itar\.1/));
    expect(search().get('L') ?? '').not.toMatch(/it50/);
    expect(within(scale('Additional rate')).getByRole('radio', { name: '46%' })).toBeChecked();
    expect(
      within(tickRow('A new 50% rate above £125,140')).getByText(
        /^Choosing this takes out “Additional rate”\.$/,
      ),
    ).toBeInTheDocument();
  });

  it('takes the rates on gains out when the 2024 rise is undone, and names both', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=cgth.1_cgtl.1`);
    const undo = screen.getByRole('checkbox', { name: 'Undo the 2024 rise' });
    expect(undo).toHaveAccessibleDescription(
      /^Choosing this takes out “Higher rate” and “Lower rate”\. would (raise|cost) £\d+\.\dbn instead$/,
    );
    fireEvent.click(undo);
    await waitFor(() => expect(search().get('L')).toMatch(/rvcgt\.1/));
    expect(search().get('L') ?? '').not.toMatch(/cgth|cgtl/);
    expect(
      within(scale('Higher rate')).getByText(
        /^Choosing a level here takes out “Undo the 2024 rise”\.$/,
      ),
    ).toBeInTheDocument();
  });

  it('lays the spending screen out by what the money is for, each section its decisions, all closed', () => {
    const { container } = at(`/finetune/spending?${BASE}&${GAME}`);
    expect(h1('Fine-tune spending')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Trim or top up any budget. A top-up costs what a trim saves. Your Director of Public Spending’s view shows once you choose.',
      ),
    ).toBeInTheDocument();
    // Four sections, as the money is for, each with no count at rest (ADR-0037).
    const sections = screen
      .getAllByRole('region')
      .filter((r) => (r.getAttribute('aria-labelledby') ?? '').startsWith('tune-'));
    expect(sections.map((r) => r.querySelector('h2')?.textContent)).toEqual([
      'Public services',
      'Investment',
      'Benefits',
      'Last year’s decisions',
    ]);
    // Nine decisions, each a heading's button, all closed: no row on arrival, and no fold.
    const toggles = [...container.querySelectorAll('.tune__decision-toggle')];
    expect(toggles).toHaveLength(9);
    for (const toggle of toggles) expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelectorAll('.tune__row')).toHaveLength(0);
    expect(screen.queryByText(/more polic(y|ies)$/)).toBeNull();
    expect(
      within(group(/^Public services$/))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Change health, schools and defence 3 choices',
      'Change the other budgets 6 choices',
      'Fund a new programme 3 choices',
    ]);
    expect(
      within(group(/^Benefits$/))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Change benefits for pensioners 3 choices',
      'Change working-age benefits 5 choices',
      'Change disability benefits 4 choices',
    ]);
    // The lead's hundred and twenty characters cannot say how long the deals run: a note does.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
    expect(screen.getByText(/falling 4\.4% a year after inflation/)).toBeInTheDocument();
    // Whose budgets most of these are: England's, and the other nations' share left out (Phase 25).
    expect(
      screen.getByText(/^Most public services here are England’s budgets\./),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.btn--primary')).toHaveLength(1);
  });

  it('draws a budget as one scale, with a minister once it moves and the flagships held', () => {
    const held = at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    // The prisons budget moved before the screen opened: its decision is open, and says so.
    expect(decision('Change the other budgets')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change health, schools and defence')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(statusOf('Change the other budgets')).toMatch(/^1 chosen · costs £\d\.\dbn$/);
    expect(group(/^Public services 1 chosen · costs £\d\.\dbn$/)).toBeInTheDocument();
    // It is where the flagship the player chose set it: a row naming the flagship, and the way
    // back to it; no scale that could quietly undo it (Phase 26).
    const prisons = namedRow('Prisons and courts');
    expect(prisons).toHaveClass('tune__row--held');
    expect(within(prisons).getByText('In your flagship policies')).toBeInTheDocument();
    expect(within(prisons).queryAllByRole('radio')).toHaveLength(0);
    expect(prisons.querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    expect(within(prisons).getByRole('link', { name: /Change/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\?/),
    );
    // The other budgets go by their short names in the card.
    expect(rowNames(panelOf('Change the other budgets'))).toEqual([
      'Home Office and borders',
      'Prisons and courts',
      'Grants to councils',
      'Transport, day to day',
      'Foreign Office and aid',
      'All other departments',
    ]);
    // A department's budget is one scale from 5% less to 5% more, the plan among them, under its
    // plain name; no Small, Medium or Large (ADR-0037).
    openDecision('Change health, schools and defence');
    const schools = scale('Schools and education');
    expect(levelsOf(schools)).toEqual([
      '5% less',
      '2% less',
      '1% less',
      'As planned',
      '1% more',
      '2% more',
      '5% more',
    ]);
    expect(within(schools).getByRole('radio', { name: 'As planned' })).toBeChecked();
    // At rest, how it grows after rising prices, then the nearest level each way in cash; no
    // minister and no adviser yet.
    expect(within(schools).queryByText('Education Secretary')).toBeNull();
    expect(priceOf(schools)).toMatch(
      /^Falls 0\.3% a year after rising prices, as planned1% less would save £\d\.\dbn · 1% more would cost £\d\.\dbn$/,
    );
    // Cut, its minister says what stops happening, and the new path sits beside the plan.
    fireEvent.click(within(schools).getByRole('radio', { name: '1% less' }));
    expect(within(schools).getByText('Education Secretary')).toBeInTheDocument();
    expect(effectOf(schools)).toMatch(
      /^Falls 0\.8% a year after rising prices \(planned: 0\.3%\) · £\d\.\dbn less than planned in 2029-30$/,
    );
    expect(statusOf('Change health, schools and defence')).toMatch(/^1 chosen · saves £\d\.\dbn$/);
    held.unmount();
    // Short of the flagship, a top-up is a scale: the flagship settled lower, and the Chief
    // Secretary says so (Phase 25); a cut is against it.
    const lower = at(`/finetune/spending?${BASE}&${GAME}&L=moj.5`);
    const topUp = scale('Prisons and courts');
    expect(within(topUp).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(topUp).getByText('In your flagship policies')).toBeInTheDocument();
    expect(
      within(topUp).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    lower.unmount();
    const against = at(`/finetune/spending?${BASE}&${GAME}&L=moj.-2`);
    const trim = scale('Prisons and courts');
    expect(within(trim).getByRole('radio', { name: '2% less' })).toBeChecked();
    expect(within(trim).getByText('Against your flagship policy')).toHaveClass('tag--warn');
    against.unmount();
    // Past its flagship's value, a top-up stays a scale that shows its own level; a setting no
    // level matches says what it is (Phase 26).
    const past = at(`/finetune/spending?${BASE}&g=st.3_pr.nhs&M=rate.0.75_rpi.0.5&L=dhsc.5`);
    const nhs = scale('Health and social care');
    expect(within(nhs).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(within(nhs).getByText('In your flagship policies')).toBeInTheDocument();
    past.unmount();
    at(`/finetune/spending?${BASE}&${GAME}&L=dhsc.3`);
    const stray = scale('Health and social care');
    expect(within(stray).getByText('Now 3% more')).toBeInTheDocument();
    for (const radio of within(stray).getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('says once which rule investment counts against, and prices it as borrowing', () => {
    at(`/finetune/spending?${BASE}&${GAME}`);
    const panel = openDecision('Change public investment');
    expect(within(panel).getAllByText(INVESTMENT_NOTE)).toHaveLength(1);
    expect(priceOf(tickRow('More council and social rent homes'))).toMatch(
      /^would add £\d+\.\dbn to borrowing$/,
    );
    expect(priceOf(scale('Public investment'))).toMatch(
      /5% less would take £\d+\.\dbn off borrowing · 5% more would add £\d+\.\dbn to borrowing$/,
    );
  });

  it('offers the way back to a flagship, not a swap, when the flagship holds the other of a pair', () => {
    // The 3% path, chosen for defence on step 3, holds its lever; the plan's gap counts some of the
    // same money, so step 4 cannot swap it in behind the flagship's back (Phase 26).
    at(`/finetune/spending?${BASE}&${GAME}&L=def3.1`);
    const gap = screen.getByRole('checkbox', { name: 'Fund the plan’s gap' });
    const row = rowOf(gap);
    expect(gap).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveClass('tune__row--blocked');
    expect(gap).toHaveAccessibleDescription(
      /^You can’t have both\. “Defence at 3% of GDP now, not in 2030-31” is in your flagship policies\./,
    );
    expect(within(row).queryByRole('button', { name: /Swap them/ })).toBeNull();
    expect(within(row).getByRole('link', { name: /Change it/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/budget\/deliver\/2\?/),
    );
    // Nothing to price: there is no swap.
    expect(priceOf(row)).toBe('');
    // The 3% path itself is a row naming its flagship, not a tick.
    const held = namedRow('3% of GDP now, not in 2030-31');
    expect(held).toHaveClass('tune__row--held');
    expect(held.textContent).toMatch(/In your flagship policies/);
    expect(within(held).queryAllByRole('checkbox')).toHaveLength(0);
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
    fireEvent.click(within(scale('Basic rate')).getByRole('radio', { name: '21%' }));
    // Nothing while arrow keys may still be moving along the scale; then only what changed, in the
    // bar's words.
    expect(status).toBeEmptyDOMElement();
    await waitFor(() => expect(status.textContent).toMatch(/^Headroom, 2029-30: £\d+\.\dbn\./), {
      timeout: 3000,
    });
    expect(status.textContent).toMatch(/1 promise broken\.$/);
    expect(status.textContent).not.toMatch(/rules met/);
  });
});

const modeLine = () => document.querySelector('.mode-line') as HTMLElement;

describe('fine-tune in basic mode: the advisers’ best ideas (Phase 27, ADR-0028)', () => {
  // A newcomer's game: the shared setup's advanced mode is cleared, as a fresh browser has it.
  beforeEach(() => window.localStorage.removeItem('btc.mode.v1'));

  it('shows the Director of Tax’s eight picks and nothing else, one card a tax', () => {
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
    // Each pick a row under its policy's title, with no decision around it to name it.
    expect(rowNames()).toEqual([
      'Give everyone the same 30% pension tax relief',
      'Put up employer National Insurance',
      'Charge employer National Insurance on pension contributions',
      'Keep VAT off electricity after March 2027',
      'Tax capital gains when someone dies',
      'End the extra inheritance tax allowance for family homes',
      'Double council tax on the biggest homes (bands G and H)',
      'Put gambling duties up again',
    ]);
    // Seven taxes, the four with no pick left out, one card each; no decisions and no count at rest.
    expect([...document.querySelectorAll('section.tune h2')].map((h) => h.textContent)).toEqual([
      'Income tax',
      'National Insurance',
      'VAT',
      'Capital gains tax',
      'Inheritance tax',
      'Council tax',
      'Duties',
    ]);
    expect(document.querySelectorAll('section.tune .tune__card')).toHaveLength(7);
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    expect(screen.queryByText(/more polic(y|ies)$/)).toBeNull();
    // The one way on show, as a scale from where the tax is planned to be (ADR-0035).
    expect(levelsOf(scale('Put up employer National Insurance'))).toEqual([
      '15% as planned',
      '16%',
      '17%',
      '18%',
    ]);
    // Still one primary button, and the rows still price themselves.
    expect(document.querySelectorAll('main .btn--primary')).toHaveLength(1);
    expect(priceOf(tickRow('Put gambling duties up again'))).toMatch(/^would raise £\d\.\dbn$/);
    // Chosen, a tax says so as it does in advanced mode.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Put gambling duties up again' }));
    expect(group(/^Duties 1 chosen · raises £\d\.\dbn/)).toBeInTheDocument();
  });

  it('says in basic mode too what a pick would take out, with no radios and no decisions', () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=pens20.1`);
    // Chosen before the screen opened, relief at the basic rate is on show beside the pick.
    expect(
      screen.getByRole('checkbox', { name: 'Give pension tax relief at the basic rate only' }),
    ).toBeChecked();
    const pick = screen.getByRole('checkbox', {
      name: 'Give everyone the same 30% pension tax relief',
    });
    expect(pick).not.toHaveAttribute('aria-disabled');
    expect(pick).toHaveAccessibleDescription(
      /^Choosing this takes out “Give pension tax relief at the basic rate only”\. would (raise|cost) £\d+\.\dbn instead$/,
    );
    expect(screen.queryByRole('radio', { name: 'As planned' })).toBeNull();
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
    expect(document.querySelectorAll('.tune__row')).toHaveLength(0);
    expect(
      [...document.querySelectorAll('.tune__decision-toggle')].map((b) =>
        b.getAttribute('aria-expanded'),
      ),
    ).toEqual(Array(26).fill('false'));
    expect(group(/^Wealth tax$/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Raise or cut any tax. Watch your headroom move. Your Director of Tax’s view shows once you choose.',
      ),
    ).toBeInTheDocument();
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('advanced');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: /^See every idea/ })).toBe(button);
    expect(within(modeLine()).getByRole('status')).toHaveTextContent(
      'Only the best ideas are on show.',
    );
    expect(rowNames()).toHaveLength(8);
    expect(window.localStorage.getItem('btc.mode.v1')).toBe('basic');
  });

  it('never hides what was chosen: a policy picked in advanced mode stays on show in basic', () => {
    window.localStorage.setItem('btc.mode.v1', 'advanced');
    at(`/finetune/tax?${BASE}&${GAME}`);
    openDecision('Tax drink, tobacco and gambling');
    fireEvent.click(within(scale('Alcohol')).getByRole('radio', { name: '5% more' }));
    // The way back to the shortlist is the screen's own button (the footer's switch is withdrawn
    // for now, ADR-0032).
    fireEvent.click(screen.getByRole('button', { name: 'Show only the best ideas' }));
    expect(document.querySelector('main')?.getAttribute('data-mode')).toBe('basic');
    // In basic mode, the way it was chosen, as a scale from the plan, under its policy's title.
    expect(rowNames()).toContain('Put up alcohol duty');
    expect(
      within(scale('Put up alcohol duty')).getByRole('radio', { name: '5% more' }),
    ).toBeChecked();
    expect(rowNames()).toHaveLength(9);
    // And back: the decision holding it opens, as it would on a visit that found it chosen.
    fireEvent.click(screen.getByRole('button', { name: /^See every idea/ }));
    expect(decision('Tax drink, tobacco and gambling')).toHaveAttribute('aria-expanded', 'true');
    expect(decision('Change fuel duty')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a lever a link chose, and keeps it on show after Undo until the next visit', async () => {
    at(`/finetune/tax?${BASE}&${GAME}&L=alc.5`);
    const alcohol = scale('Put up alcohol duty');
    expect(within(alcohol).getByRole('radio', { name: '5% more' })).toBeChecked();
    expect(group(/^Duties 1 chosen · raises/)).toBeInTheDocument();
    fireEvent.click(within(alcohol).getByRole('button', { name: 'Undo for Put up alcohol duty' }));
    await waitFor(() => expect(search().get('L') ?? '').not.toMatch(/alc/));
    // Still on show: a row never vanishes from under the pointer.
    expect(scale('Put up alcohol duty')).toBe(alcohol);
    expect(group(/^Duties$/)).toBeInTheDocument();
  });

  it('shows the flagships’ rows and the defence plan’s gap, which the briefing puts on the desk', () => {
    at(`/finetune/spending?${BASE}&${GAME}&L=moj.10`);
    expect(
      screen.getByText(
        'Your Director of Public Spending’s best ideas. A top-up costs what a trim saves.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'See every idea (all 46 spending policies)' }),
    ).toBeInTheDocument();
    // The prisons flagship holds its lever: its row shows in basic mode as in advanced.
    expect(namedRow('Prisons and courts').querySelector('.lever__held')?.textContent).toMatch(
      /^More money for prisons and courts: 10% more\. Change/,
    );
    // In the order of their decisions: the defence plan's gap after council homes, and the PIP
    // cuts beside the reset they contradict (ADR-0037).
    expect(rowNames()).toEqual([
      'Spend more on health and social care',
      'Spend more on schools and education',
      'Prisons and courts',
      'Spend more on public investment',
      'More council and social rent homes',
      'Fund the defence plan’s gap',
      'Raise housing benefit to match local rents',
      'Go ahead with the 2025 cuts to PIP',
      'Limit winter fuel payments to pensioners on pension credit',
    ]);
    // A pick is the one way on show, a scale from where the budget is planned to be; no decisions.
    expect(document.querySelectorAll('.tune__decision-toggle')).toHaveLength(0);
    expect(levelsOf(scale('Spend more on health and social care'))).toEqual([
      'As planned',
      '1% more',
      '2% more',
      '5% more',
    ]);
    // The screen's notes stay: how long the settlements run, and whose budgets these are.
    expect(
      screen.getByText(/Departments’ day-to-day budgets are set to 2028-29\. Cutting one reopens/),
    ).toBeInTheDocument();
  });
});
