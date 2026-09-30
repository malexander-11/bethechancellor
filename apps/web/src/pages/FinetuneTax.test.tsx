import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { finetune } from '../data';
import { RELIEF_NOTE } from '../components/LeverRow';
import {
  BASE,
  GAME,
  at,
  bar,
  barFigure,
  decision,
  effectOf,
  group,
  h1,
  levelsOf,
  namedRow,
  openDecision,
  panelOf,
  priceOf,
  rowNames,
  rowOf,
  scale,
  search,
  statusOf,
  tickRow,
} from '../test/finetune';

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
    // The taxes in the data's order, each named plainly and with no count at rest (ADR-0035).
    const sections = screen
      .getAllByRole('region')
      .filter((r) => (r.getAttribute('aria-labelledby') ?? '').startsWith('tune-'));
    expect(sections.map((r) => r.querySelector('h2')?.textContent)).toEqual(
      finetune.tax.groups.map((g) => g.label),
    );
    // Every decision a heading's button, all closed: no row on arrival.
    const toggles = [...container.querySelectorAll('.tune__decision-toggle')];
    expect(toggles).toHaveLength(finetune.tax.groups.flatMap((g) => g.decisions).length);
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

  it('makes the wealth tax, gains that go untaxed and the rates on dividends one choice each', async () => {
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

    const gains = openDecision('Tax gains that go untaxed');
    const untaxed = within(gains).getByRole('group', { name: 'Capital gains that go untaxed' });
    expect(within(untaxed).getByText('Capital gains that go untaxed')).not.toHaveClass('sr-only');
    fireEvent.click(within(untaxed).getByRole('radio', { name: 'When someone dies' }));
    // Gains on main homes are no part of the choice: a tick beside it, chosen with either.
    fireEvent.click(within(gains).getByRole('checkbox', { name: 'On main homes' }));
    await waitFor(() => expect(search().get('L')).toMatch(/cgtdth\.1/));
    fireEvent.click(within(untaxed).getByRole('radio', { name: 'When someone leaves the UK' }));
    await waitFor(() => expect(search().get('L')).toMatch(/cgtexit\.1/));
    expect(search().get('L')).toMatch(/cgtprr\.1/);
    expect(search().get('L') ?? '').not.toMatch(/cgtdth/);

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
});
