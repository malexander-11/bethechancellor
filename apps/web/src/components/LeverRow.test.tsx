import { computeOutcome, finetuneItems, scaleLevels } from '@btc/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { finetune, levers, rules, vintage } from '../data';
import { effectPhrase, LeverAbout, LeverRow, wouldPhrase } from './LeverRow';

const lever = (code: string) => {
  const found = levers.find((l) => l.code === code);
  if (!found) throw new Error(`missing ${code}`);
  return found;
};
/** What a lever does with these levers moved, as the screen reads it. */
const effectAt = (values: Record<string, number>, code: string) =>
  computeOutcome({ vintage, rules, levers, settings: { leverValues: values } }).leverEffects.find(
    (e) => e.code === code,
  );
/** A lever's scale on step 4: every level its ways come in, the plan among them (ADR-0035). */
const levelsOf = (code: string) => {
  const item = finetuneItems(finetune).find((i) => i.code === code);
  if (!item) throw new Error(`no step-4 lever ${code}`);
  return scaleLevels(lever(code), item.policies);
};
const line = {
  text: 'A penny is big money.',
  sources: [{ sourceId: 'hmrc-trr-2025-06' }],
  badge: 'simulated' as const,
};
const radioNames = () =>
  screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent ?? '');

describe('a row in a decision’s card (ADR-0037)', () => {
  it('says what a move would do in the conditional, with no headroom', () => {
    expect(wouldPhrase('Raises £8.6bn', false)).toBe('would raise £8.6bn');
    // A relief's cost is the most ending it could raise (Phase 25).
    expect(wouldPhrase('Raises £32.5bn', true)).toBe('would raise at most £32.5bn');
    expect(wouldPhrase('Costs £1.5bn', false)).toBe('would cost £1.5bn');
    expect(wouldPhrase('Saves £0.9bn', false)).toBe('would save £0.9bn');
    // Investment is read as borrowing; which rule it counts against, the card says once.
    expect(wouldPhrase('Borrowing up £13.4bn; it counts against the debt rule', false)).toBe(
      'would add £13.4bn to borrowing',
    );
    expect(wouldPhrase('Borrowing down £6.7bn; it counts against the debt rule', false)).toBe(
      'would take £6.7bn off borrowing',
    );
    expect(wouldPhrase('Nothing until 2030-31, then raises £18.5bn', false)).toBe(
      'would raise nothing until 2030-31, then £18.5bn',
    );
  });

  it('says what a moved lever does, the verb first and then the year', () => {
    expect(
      effectPhrase(lever('vatfood'), 1, effectAt({ vatfood: 1 }, 'vatfood'), '2029-30'),
    ).toMatch(/^raises at most £\d+\.\dbn in 2029-30$/);
    // Nothing before its earliest start (ADR-0021): the year it begins, and what it does then.
    expect(effectPhrase(lever('wealth2'), 1, effectAt({ wealth2: 1 }, 'wealth2'), '2029-30')).toBe(
      'nothing in 2029-30; from 2030-31 raises £18.5bn',
    );
    // Investment is borrowing.
    expect(
      effectPhrase(lever('socrent'), 1, effectAt({ socrent: 1 }, 'socrent'), '2029-30'),
    ).toMatch(/^adds £\d\.\dbn to borrowing in 2029-30$/);
    // A budget is growth after rising prices, then money against its plan (Phase 25).
    expect(effectPhrase(lever('cdel'), 10, effectAt({ cdel: 10 }, 'cdel'), '2029-30')).toMatch(
      / · £13\.4bn more than planned in 2029-30$/,
    );
    expect(effectPhrase(lever('dhsc'), 1, effectAt({ dhsc: 1 }, 'dhsc'), '2029-30')).toMatch(
      /^Grows 3\.\d% a year after rising prices \(planned: 2\.9%\) · £2\.4bn more than planned in 2029-30$/,
    );
    expect(effectPhrase(lever('vatfood'), 1, undefined, '2029-30')).toBe('');
  });

  it('is a tick with its short name and one price at rest; chosen, its effect, adviser and Undo', () => {
    const food = lever('vatfood');
    const onChange = vi.fn();
    const at = (value: number) => (
      <LeverRow
        lever={food}
        value={value}
        effect={value ? effectAt({ vatfood: 1 }, 'vatfood') : undefined}
        summaryYear="2029-30"
        name="Food"
        onChange={onChange}
        levels={[1]}
        prices={['would raise at most £32.5bn']}
        advice={line}
      >
        <p>From the minister</p>
      </LeverRow>
    );
    const { rerender, container } = render(at(0));
    // Its name alone names the box; its price describes it; nothing else waits on the surface.
    const box = screen.getByRole('checkbox', { name: 'Food' });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription('would raise at most £32.5bn');
    expect(screen.getByText('Not on the table')).toHaveClass('tag--quiet');
    expect(container.textContent).not.toMatch(/headroom/);
    expect(screen.queryByText(/A penny is big money/)).toBeNull();
    expect(screen.queryByText('From the minister')).toBeNull();
    expect(screen.queryByRole('button', { name: /Undo/ })).toBeNull();
    expect(document.querySelector('.badge')).toBeNull();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(1);
    rerender(at(1));
    // Chosen: the price gives way to what it does, and the adviser speaks.
    expect(screen.getByRole('checkbox', { name: 'Food' })).toBeChecked();
    expect(screen.queryByText('would raise at most £32.5bn')).toBeNull();
    expect(screen.getByText(/^raises at most £\d+\.\dbn in 2029-30$/)).toBeInTheDocument();
    expect(screen.getByText(/A penny is big money/)).toBeInTheDocument();
    expect(screen.getByText('From the minister')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo for Food' }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('says first what choosing would take out, and still moves (ADR-0036)', () => {
    const onChange = vi.fn();
    const one = render(
      <LeverRow
        lever={lever('vat1z')}
        value={0}
        summaryYear="2029-30"
        name="1% on everything now zero-rated"
        onChange={onChange}
        levels={[1]}
        prices={['would raise £4.2bn instead']}
        takesOut={{ names: ['Food', 'Books'], reason: 'The 1% rate already covers food.' }}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '1% on everything now zero-rated' });
    expect(box).not.toHaveAttribute('aria-disabled');
    expect(box).toHaveAccessibleDescription(
      'Choosing this takes out “Food” and “Books”. The 1% rate already covers food. would raise £4.2bn instead',
    );
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(1);
    one.unmount();
    // Beside it in the same card, what it takes out needs no reason: the fold has it.
    const near = render(
      <LeverRow
        lever={lever('vat1z')}
        value={0}
        summaryYear="2029-30"
        name="1% on everything now zero-rated"
        onChange={onChange}
        levels={[1]}
        takesOut={{ names: ['Food'], reason: '' }}
      />,
    );
    expect(near.container.querySelector('.lever__takes-out')?.textContent).toBe(
      'Choosing this takes out “Food”.',
    );
    near.unmount();
    // A scale says it of a level.
    render(
      <LeverRow
        lever={lever('itar')}
        value={0}
        summaryYear="2029-30"
        name="Additional rate"
        onChange={onChange}
        levels={levelsOf('itar')}
        takesOut={{
          names: ['A new 50% income tax rate above £125,140'],
          reason: 'Both set the rate on income above £125,140.',
        }}
      />,
    );
    expect(
      screen.getByText(
        /^Choosing a level here takes out “A new 50% income tax rate above £125,140”\./,
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '46%' }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('draws one of a set of choices as a radio in place of its box (ADR-0036)', () => {
    const onChoose = vi.fn();
    const at = (value: number, checked: boolean) => (
      <LeverRow
        lever={lever('wealth')}
        value={value}
        summaryYear="2029-30"
        name="1% a year"
        onChange={() => undefined}
        levels={[1]}
        radio={{ name: 'the-wealth-tax', checked, onChoose }}
      />
    );
    const { rerender } = render(at(0, false));
    expect(screen.queryByRole('checkbox')).toBeNull();
    const radio = screen.getByRole('radio', { name: '1% a year' });
    expect(radio).toHaveAttribute('name', 'the-wealth-tax');
    expect(radio).not.toBeChecked();
    fireEvent.click(radio);
    expect(onChoose).toHaveBeenCalledTimes(1);
    rerender(at(1, true));
    expect(screen.getByRole('radio', { name: '1% a year' })).toBeChecked();
    // Chosen, it can be put back like any tick; "As planned", drawn by the card, does the same.
    expect(screen.getByRole('button', { name: 'Undo for 1% a year' })).toBeInTheDocument();
  });

  it('draws a lever that moves both ways as one scale, the plan among its levels (ADR-0035)', () => {
    const chosen: number[] = [];
    const at = (value: number, prices: string[] = []) => (
      <LeverRow
        lever={lever('itbr')}
        value={value}
        effect={value ? effectAt({ itbr: value }, 'itbr') : undefined}
        summaryYear="2029-30"
        name="Basic rate"
        onChange={(v) => chosen.push(v)}
        levels={levelsOf('itbr')}
        prices={prices}
        advice={line}
      />
    );
    const { rerender, container } = render(
      at(0, ['21% would raise £8.6bn', '19% would cost £8.6bn']),
    );
    // One group named by the row, its levels named by what each sets, and one price line a scale.
    const group = screen.getByRole('radiogroup', { name: 'Basic rate' });
    expect(radioNames()).toEqual(['17%', '18%', '19%', '20% as planned', '21%', '22%', '25%']);
    expect(screen.getByRole('radio', { name: '20% as planned' })).toBeChecked();
    expect(group).toHaveAccessibleDescription('21% would raise £8.6bn · 19% would cost £8.6bn');
    expect(screen.queryByText(/A penny is big money/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '22%' }));
    rerender(at(2));
    expect(screen.getByRole('radio', { name: '22%' })).toBeChecked();
    expect(container.querySelector('.tune__row-price')).toBeNull();
    expect(screen.getByText(/^raises £1\d\.\dbn in 2029-30$/)).toBeInTheDocument();
    expect(screen.getByText(/A penny is big money/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '20% as planned' }));
    expect(chosen).toEqual([2, 0]);
    // Past HMRC's figure, the straight line is the game's arithmetic, and the row says so.
    rerender(at(5));
    expect(screen.getByText(/Beyond 2p the game scales it in a straight line/)).toBeInTheDocument();
    // An old link's 23%: what it is now, and no level checked.
    rerender(at(3));
    expect(screen.getByText('Now 23%')).toBeInTheDocument();
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('names each level by its own words: a budget’s shares, inheritance tax’s labels', () => {
    const rates = render(
      <LeverRow
        lever={lever('brates')}
        value={0}
        summaryYear="2029-30"
        name="Business rates"
        onChange={() => undefined}
        levels={levelsOf('brates')}
      />,
    );
    expect(radioNames()).toEqual([
      '5% less',
      '2% less',
      '1% less',
      'As planned',
      '1% more',
      '2% more',
      '5% more',
    ]);
    rates.unmount();
    render(
      <LeverRow
        lever={lever('iht')}
        value={0}
        summaryYear="2029-30"
        name="Inheritance tax"
        onChange={() => undefined}
        levels={levelsOf('iht')}
      />,
    );
    expect(radioNames()).toEqual(['Abolish (0%)', '30%', '35%', '40% as planned', '45%', '50%']);
  });

  it('keeps a budget’s growth in view at rest, and brings its minister once it moves', () => {
    const at = (value: number) => (
      <LeverRow
        lever={lever('dhsc')}
        value={value}
        effect={value ? effectAt({ dhsc: value }, 'dhsc') : undefined}
        summaryYear="2029-30"
        name="Health and social care"
        onChange={() => undefined}
        levels={levelsOf('dhsc')}
        prices={['1% less would save £2.4bn', '1% more would cost £2.4bn']}
      >
        <p>From the minister</p>
      </LeverRow>
    );
    const { rerender } = render(at(0));
    expect(
      screen.getByRole('radiogroup', { name: 'Health and social care' }),
    ).toHaveAccessibleDescription(
      'Grows 2.9% a year after rising prices, as planned 1% less would save £2.4bn · 1% more would cost £2.4bn',
    );
    expect(
      screen.getByText('Grows 2.9% a year after rising prices, as planned'),
    ).toBeInTheDocument();
    expect(screen.queryByText('From the minister')).toBeNull();
    rerender(at(-1));
    // A cut to a growing budget cannot read as a rise.
    expect(
      screen.getByText(
        /^Still grows 2\.4% a year after rising prices \(planned: 2\.9%\) · £2\.4bn less than planned in 2029-30$/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('From the minister')).toBeInTheDocument();
  });

  it('wears the manifesto red line and the promise to the PM as tags', () => {
    const itbr = lever('itbr');
    const moj = lever('moj');
    const row = (props: Partial<Parameters<typeof LeverRow>[0]>) => (
      <LeverRow
        lever={itbr}
        value={0}
        summaryYear="2029-30"
        name="Basic rate"
        onChange={() => undefined}
        levels={levelsOf('itbr')}
        {...props}
      />
    );
    const quiet = render(
      row({ redLines: [{ promise: 'The tax lock', when: 'above', broken: false }] }),
    );
    expect(within(quiet.container).getByText('Manifesto: no rise').textContent).toMatch(
      /The tax lock/,
    );
    quiet.unmount();
    // Named, the resting tag says which promise, and opens what it covers (Phase 25).
    const named = render(
      row({
        redLines: [
          {
            promise: 'The tax lock',
            id: 'tax-lock',
            tag: 'Tax lock',
            when: 'above',
            broken: false,
          },
        ],
      }),
    );
    const word = within(named.container).getByRole('button', { name: 'Tax lock' });
    expect(word.closest('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    fireEvent.click(word);
    expect(named.container.textContent).toMatch(/not to raise National Insurance, VAT/);
    named.unmount();
    const crossed = render(
      row({ value: 1, redLines: [{ promise: 'The tax lock', when: 'above', broken: true }] }),
    );
    expect(within(crossed.container).getByText('Breaks the manifesto: The tax lock')).toHaveClass(
      'tag--warn',
    );
    crossed.unmount();
    // Amber (Phase 23): employer National Insurance keeps the pledge's words and tests its spirit.
    const strained = render(
      row({
        lever: lever('nicer'),
        value: 1,
        levels: levelsOf('nicer'),
        redLines: [{ promise: 'The tax lock', when: 'above', broken: true, severity: 'strains' }],
      }),
    );
    expect(within(strained.container).getByText('Strains the manifesto: The tax lock')).toHaveClass(
      'tag--amber',
    );
    strained.unmount();
    const prisons = (value: number, state: 'on' | 'adjusted' | 'against') =>
      render(
        row({
          lever: moj,
          value,
          name: 'Prisons and courts',
          levels: levelsOf('moj'),
          chosen: { title: 'More money for prisons and courts', state },
        }),
      );
    const funded = prisons(10, 'on');
    expect(within(funded.container).getByText('In your flagship policies')).toBeInTheDocument();
    funded.unmount();
    // Trimmed short of what was chosen (Phase 25): still the flagship's, settled lower, in the
    // Chief Secretary's words, naming whoever asked.
    const settled = prisons(5, 'adjusted');
    expect(within(settled.container).getByText('In your flagship policies')).toBeInTheDocument();
    expect(
      within(settled.container).getByText('Chief Secretary to the Treasury'),
    ).toBeInTheDocument();
    expect(
      within(settled.container).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    settled.unmount();
    // Moved the other way: a red tag, and no line about settling.
    const against = prisons(-2, 'against');
    expect(within(against.container).getByText('Against your flagship policy')).toHaveClass(
      'tag--warn',
    );
    expect(within(against.container).queryByText(/Settled lower/)).toBeNull();
  });
});

describe('focus after Undo (2026-09-30)', () => {
  /** A row that keeps its own value, as a card's state does. */
  function Row({ code, levels, name }: { code: string; levels: readonly number[]; name: string }) {
    const [value, setValue] = useState(1);
    return (
      <LeverRow
        lever={lever(code)}
        value={value}
        summaryYear="2029-30"
        name={name}
        onChange={setValue}
        levels={levels}
      />
    );
  }

  it('lands on the box that was undone, not on the page, when the button goes', () => {
    render(<Row code="vatfood" levels={[1]} name="Food" />);
    const undo = screen.getByRole('button', { name: 'Undo for Food' });
    undo.focus();
    fireEvent.click(undo);
    expect(screen.queryByRole('button', { name: 'Undo for Food' })).toBeNull();
    const box = screen.getByRole('checkbox', { name: 'Food' });
    expect(box).not.toBeChecked();
    expect(box).toHaveFocus();
  });

  it('lands on the plan on a scale', () => {
    render(<Row code="dhsc" levels={levelsOf('dhsc')} name="Health and social care" />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo for Health and social care' }));
    expect(screen.getByRole('radio', { checked: true })).toHaveFocus();
  });
});

describe('everything else about a lever, in its card’s fold (ADR-0037)', () => {
  it('holds the headline, a budget’s cash and milestones, its tags, and what it assumes', () => {
    const dhsc = lever('dhsc');
    const { container } = render(
      <LeverAbout
        lever={dhsc}
        name="Health and social care"
        value={1}
        summaryYear="2029-30"
        headingLevel={4}
      />,
    );
    const scope = within(container);
    expect(
      scope.getByRole('heading', { level: 4, name: 'Health and social care' }),
    ).toBeInTheDocument();
    expect(scope.getByText(dhsc.headline ?? '')).toBeInTheDocument();
    expect(container.querySelector('.lever__cash-note')?.textContent).toMatch(
      /^Cash: £232\.0bn → £234\.3bn in 2028-29; growth measured from 2026-27 to 2028-29\.$/,
    );
    const milestones = container.querySelector('.milestones')?.textContent ?? '';
    expect(milestones).toMatch(/This Spending Review\+2\.8% a year/);
    expect(scope.getByText('Barnett applies')).toBeInTheDocument();
    expect(scope.getByText('Protected')).toBeInTheDocument();
    expect(scope.getByText('What this assumes')).toBeInTheDocument();
  });

  it('names when a measure can start, and what it counts the same money as, and why', () => {
    const wealth2 = render(
      <LeverAbout
        lever={lever('wealth2')}
        name="2% a year"
        value={0}
        summaryYear="2029-30"
        headingLevel={4}
      />,
    );
    const tag = within(wealth2.container).getByText('Earliest start').closest('.tag');
    expect(tag).toHaveClass('tag--quiet');
    expect(tag?.textContent).toMatch(/April 2030/);
    expect(
      within(wealth2.container).getByText(/^A 1% yearly tax on wealth above £10 million: /),
    ).toBeInTheDocument();
    wealth2.unmount();
    const one = render(
      <LeverAbout
        lever={lever('vat1z')}
        name="1% on everything now zero-rated"
        value={0}
        summaryYear="2029-30"
        headingLevel={4}
      />,
    );
    expect(within(one.container).getByText('Counts the same money as')).toBeInTheDocument();
    expect(within(one.container).getByText(/^Charge VAT on food: /)).toBeInTheDocument();
    expect(one.container.querySelectorAll('.lever__assumes-list')[0]?.children).toHaveLength(5);
  });
});
