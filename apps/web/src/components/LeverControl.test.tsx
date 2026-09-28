import { computeOutcome } from '@btc/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { levers, rules, vintage } from '../data';
import { formatLeverValue, formatLeverValueShort, LeverControl } from './LeverControl';

describe('LeverControl', () => {
  it('reads a relief cost as the most it could raise, with one plain line on why (Phase 25)', () => {
    const food = levers.find((l) => l.code === 'vatfood');
    if (!food) throw new Error('missing vatfood');
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { vatfood: 1 } },
    });
    const { rerender } = render(
      <LeverControl lever={food} value={0} summaryYear="2029-30" onChange={() => undefined} />,
    );
    // At rest on the desk the card keeps to its headline; the caveat waits for the move.
    expect(screen.queryByText(/HMRC’s cost of the tax break/)).toBeNull();
    rerender(
      <LeverControl
        lever={food}
        value={1}
        effect={outcome.leverEffects.find((e) => e.code === 'vatfood')}
        summaryYear="2029-30"
        onChange={() => undefined}
      />,
    );
    // "Day-to-day budget", not "Current budget", which a newcomer reads as "now" (Phase 25).
    expect(screen.getByText(/Day-to-day budget in 2029-30/).textContent).toMatch(
      /raises at most £\d+\.\dbn/,
    );
    expect(
      screen.getByText(
        'HMRC’s cost of the tax break. The real sum would be less, as people change what they do.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps a blocked lever in reach but still, and says what to untick and why', () => {
    const death = levers.find((l) => l.code === 'cgtdth');
    if (!death) throw new Error('missing cgtdth');
    const onChange = vi.fn();
    const onSwap = vi.fn();
    render(
      <LeverControl
        lever={death}
        value={0}
        onChange={onChange}
        blocked={{
          other: 'Tax capital gains at the same rates as income',
          untick: true,
          reason: 'The alignment package already ends the tax-free uplift at death.',
          onSwap,
        }}
      />,
    );
    const box = screen.getByRole('checkbox');
    expect(box).toBeEnabled();
    expect(box).toHaveAttribute('aria-disabled', 'true');
    expect(box).toHaveAccessibleDescription(
      /^You can’t have both\. Untick “Tax capital gains at the same rates as income” to choose this\. The alignment package/,
    );
    fireEvent.click(box);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Swap them/ }));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('renders a reversal toggle as a checkbox that reports 1 or 0', () => {
    const lever = levers.find((l) => l.code === 'rvfrz');
    if (!lever) throw new Error('missing toggle lever');
    const onChange = vi.fn();
    render(<LeverControl lever={lever} value={0} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: /End the personal tax threshold freeze/ });
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByText('Official figure')).toBeInTheDocument();
  });

  it('reports borrowing for a capital lever and shows a Barnett note for comparable departments', () => {
    const cdel = levers.find((l) => l.code === 'cdel');
    const dhsc = levers.find((l) => l.code === 'dhsc');
    const mod = levers.find((l) => l.code === 'mod');
    if (!cdel || !dhsc || !mod) throw new Error('missing spending levers');
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { cdel: 10, dhsc: 1 } },
    });
    const { unmount } = render(
      <LeverControl
        lever={cdel}
        value={10}
        effect={outcome.leverEffects.find((e) => e.code === 'cdel')}
        summaryYear="2029-30"
        onChange={() => undefined}
      />,
    );
    // A spending line moved reads as money against its plan, in the card's one year (Phase 25).
    const borrowing = screen.getByText(/£13\.4bn more than planned in 2029-30/);
    // Investment counts against the debt rule; the day-to-day rule moves only by interest.
    expect(borrowing.textContent).toMatch(/counts against the debt rule, not the day-to-day rule/);
    expect(screen.queryByText(/Barnett formula/)).toBeNull();
    unmount();

    const { container } = render(
      <LeverControl
        lever={dhsc}
        value={1}
        effect={outcome.leverEffects.find((e) => e.code === 'dhsc')}
        summaryYear="2029-30"
        onChange={() => undefined}
      />,
    );
    const scope = within(container);
    expect(scope.getByText('Barnett applies')).toBeInTheDocument();
    expect(scope.getByText(/£2\.4bn more than planned in 2029-30/)).toBeInTheDocument();
    fireEvent.click(scope.getByRole('button', { name: /Detail and sources/ }));
    expect(scope.getByText(/Spending Review 2025 rows/)).toBeInTheDocument();
    expect(scope.getAllByText(/extended from 2028-29/)).toHaveLength(2);
    // Only the "increase" Barnett note applies at +1%.
    expect(scope.getAllByText(/would also raise those block grants/)).toHaveLength(1);
    expect(scope.queryByText(/would also cut those block grants/)).toBeNull();
  });

  it('wears the manifesto red line and the promise to the PM as tags', () => {
    const itbr = levers.find((l) => l.code === 'itbr');
    const moj = levers.find((l) => l.code === 'moj');
    if (!itbr || !moj) throw new Error('missing levers');
    const quiet = render(
      <LeverControl
        lever={itbr}
        value={0}
        onChange={() => undefined}
        redLines={[{ promise: 'The tax lock', when: 'above', broken: false }]}
      />,
    );
    expect(within(quiet.container).getByText('Manifesto: no rise').textContent).toMatch(
      /The tax lock/,
    );
    quiet.unmount();
    // Named, the resting tag says which promise, and opens what it covers (Phase 25).
    const named = render(
      <LeverControl
        lever={itbr}
        value={0}
        onChange={() => undefined}
        redLines={[
          {
            promise: 'The tax lock',
            id: 'tax-lock',
            tag: 'Tax lock',
            when: 'above',
            broken: false,
          },
        ]}
      />,
    );
    const word = within(named.container).getByRole('button', { name: 'Tax lock' });
    expect(word.closest('.tag--manifesto')?.textContent).toMatch(/^Tax lock: no rise/);
    fireEvent.click(word);
    expect(named.container.textContent).toMatch(/not to raise National Insurance, VAT/);
    named.unmount();
    const crossed = render(
      <LeverControl
        lever={itbr}
        value={1}
        onChange={() => undefined}
        redLines={[{ promise: 'The tax lock', when: 'above', broken: true }]}
      />,
    );
    expect(within(crossed.container).getByText('Breaks the manifesto: The tax lock')).toHaveClass(
      'tag--warn',
    );
    crossed.unmount();
    // Amber (Phase 23): the levy keeps the pledge's words and tests its spirit.
    const hscl = levers.find((l) => l.code === 'hscl');
    if (!hscl) throw new Error('missing levy');
    const strained = render(
      <LeverControl
        lever={hscl}
        value={1}
        onChange={() => undefined}
        redLines={[{ promise: 'The tax lock', when: 'on', broken: true, severity: 'strains' }]}
      />,
    );
    expect(within(strained.container).getByText('Strains the manifesto: The tax lock')).toHaveClass(
      'tag--amber',
    );
    strained.unmount();
    const funded = render(
      <LeverControl
        lever={moj}
        value={10}
        onChange={() => undefined}
        chosen={{ title: 'More money for prisons and courts', state: 'on' }}
      />,
    );
    expect(within(funded.container).getByText('In your flagship policies')).toBeInTheDocument();
    funded.unmount();
    // Trimmed short of what was chosen (Phase 25): still the flagship's, settled lower, in the
    // Chief Secretary's words, naming whoever asked.
    const settled = render(
      <LeverControl
        lever={moj}
        value={4}
        onChange={() => undefined}
        chosen={{ title: 'More money for prisons and courts', state: 'adjusted' }}
      />,
    );
    expect(within(settled.container).getByText('In your flagship policies')).toBeInTheDocument();
    expect(
      within(settled.container).getByText('Chief Secretary to the Treasury'),
    ).toBeInTheDocument();
    expect(
      within(settled.container).getByText(/Settled lower: the Justice Secretary asked for more/),
    ).toBeInTheDocument();
    settled.unmount();
    // Moved the other way: a red tag, and no line about settling.
    const against = render(
      <LeverControl
        lever={moj}
        value={-2}
        onChange={() => undefined}
        chosen={{ title: 'More money for prisons and courts', state: 'against' }}
      />,
    );
    expect(within(against.container).getByText('Against your flagship policy')).toHaveClass(
      'tag--warn',
    );
    expect(within(against.container).queryByText(/Settled lower/)).toBeNull();
  });

  it('wears a curated title, a price at rest, an adviser line and a fold for the rest', () => {
    // The fine-tuning screens' card (Phase 24): the desk's control with a plain name, the numbers
    // in view before anything moves, one adviser's line, the warnings that apply now, and the
    // lever's own headline and caveats under one fold.
    const itbr = levers.find((l) => l.code === 'itbr');
    if (!itbr) throw new Error('missing basic rate');
    const line = {
      text: 'A penny is big money.',
      sources: [{ sourceId: 'hmrc-trr-2025-06' }],
      badge: 'simulated' as const,
    };
    const rest = render(
      <LeverControl
        lever={itbr}
        value={0}
        summaryYear="2029-30"
        onChange={() => undefined}
        displayTitle="The basic rate of income tax"
        hint={{ text: 'Up 1p to 21%: would raise £8.6bn', headroom: '£32.2bn' }}
        advice={{ line }}
        notes={[
          { key: 'x', text: 'Overlaps with Something: both move the same base.', warn: true },
        ]}
        compact
      >
        <p>From the minister</p>
      </LeverControl>,
    );
    const slider = screen.getByRole('slider', { name: 'The basic rate of income tax' });
    // The price at rest describes the control, with the lever's own headline, folded. It is in
    // the conditional and in plain ink (Phase 25): not money already in the Budget.
    expect(slider).toHaveAccessibleDescription(
      expect.stringContaining('Up 1p to 21%: would raise £8.6bn · headroom would be £32.2bn'),
    );
    const hint = screen.getByText(/^Up 1p to 21%: would raise £8\.6bn/);
    expect(hint).toHaveClass('lever__hint');
    expect(hint).not.toHaveClass('amount--better');
    // The screen's lead names the adviser once; the card's line carries its badge after it.
    expect(screen.queryByText('Director of Tax')).toBeNull();
    const said = screen.getByText(/A penny is big money/);
    expect(said.textContent).toMatch(/^A penny is big money\. Game judgement/);
    // At rest there is no "20% → 20%": the level, as planned.
    expect(screen.getByText('as planned')).toBeInTheDocument();
    expect(screen.queryByText('→')).toBeNull();
    expect(screen.getByText(/^Warning: Overlaps with Something/)).toHaveClass(
      'choice__overlap--warn',
    );
    expect(screen.getByText('From the minister')).toBeInTheDocument();
    const fold = screen.getByText(/^More about this/).closest('details') as HTMLElement;
    expect(within(fold).getByText(itbr.headline ?? '')).toBeInTheDocument();
    expect(within(fold).getByText('What this assumes')).toBeInTheDocument();
    // The slider's ends wait in the fold on a phone (Phase 25).
    expect(within(fold).getByText('The slider runs from 17% to 25%.')).toBeInTheDocument();
    rest.unmount();
    // Moved, the hint gives way to the lever's own effect line.
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { itbr: 1 } },
    });
    render(
      <LeverControl
        lever={itbr}
        value={1}
        effect={outcome.leverEffects.find((e) => e.code === 'itbr')}
        summaryYear="2029-30"
        onChange={() => undefined}
        displayTitle="The basic rate of income tax"
        hint={{ text: 'Up 1p to 21%: would raise £8.6bn', headroom: '£32.2bn' }}
        compact
      />,
    );
    expect(screen.queryByText(/^Up 1p to 21%/)).toBeNull();
    expect(screen.getByText(/Day-to-day budget in 2029-30: raises £8\.\dbn/)).toBeInTheDocument();
    // Undo, not "Back to OBR" (Phase 25).
    expect(
      screen.getByRole('button', { name: 'Undo for The basic rate of income tax' }),
    ).toBeInTheDocument();
  });

  it('badges a move past its source’s range Worked out, and says why (Phase 25)', () => {
    const itbr = levers.find((l) => l.code === 'itbr');
    if (!itbr) throw new Error('missing basic rate');
    const at = (value: number) =>
      render(
        <LeverControl
          lever={itbr}
          value={value}
          effect={computeOutcome({
            vintage,
            rules,
            levers,
            settings: { leverValues: { itbr: value } },
          }).leverEffects.find((e) => e.code === 'itbr')}
          summaryYear="2029-30"
          onChange={() => undefined}
        />,
      );
    const two = at(2);
    expect(within(two.container).queryByText(/does not vouch for/)).toBeNull();
    two.unmount();
    const five = at(5);
    const note = within(five.container).getByText(
      /Beyond 2p the game scales it in a straight line/,
    );
    expect(note.closest('.lever__effect')?.textContent).toMatch(/Worked out/);
    five.unmount();
    // The curated card stops where the source does, and keeps a setting already past it in reach.
    const curated = render(
      <LeverControl
        lever={itbr}
        value={4}
        onChange={() => undefined}
        range={{ min: -2, max: 2 }}
        compact
      />,
    );
    const slider = within(curated.container).getByRole('slider');
    expect(slider).toHaveAttribute('min', '-2');
    expect(slider).toHaveAttribute('max', '4');
  });

  it('formats pence, points, per cent and pounds', () => {
    const itbr = levers.find((l) => l.code === 'itbr');
    const nicm = levers.find((l) => l.code === 'nicm');
    const fuel = levers.find((l) => l.code === 'fuel');
    const nicpt = levers.find((l) => l.code === 'nicpt');
    if (!itbr || !nicm || !fuel || !nicpt) throw new Error('missing levers');
    expect(formatLeverValue(itbr, -1)).toBe('−1p');
    // A point, never "pp" (Phase 25).
    expect(formatLeverValue(nicm, 0.5)).toBe('+0.5 points');
    expect(formatLeverValueShort(nicm, 1)).toBe('+1 point');
    expect(formatLeverValue(fuel, 10)).toBe('+10%');
    expect(formatLeverValue(nicpt, 1040)).toBe('+£1,040');
  });

  it('shows the level a setting moves to, a select for inheritance tax and £bn for departments', () => {
    const itbr = levers.find((l) => l.code === 'itbr');
    const iht = levers.find((l) => l.code === 'iht');
    const dhsc = levers.find((l) => l.code === 'dhsc');
    if (!itbr || !iht || !dhsc) throw new Error('missing levers');
    const first = render(<LeverControl lever={itbr} value={1} onChange={() => undefined} />);
    expect(within(first.container).getByText('20%')).toBeInTheDocument();
    expect(within(first.container).getByText('21%')).toBeInTheDocument();
    // A screen reader hears the level and the move in words (Phase 25).
    expect(within(first.container).getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      '21%, up 1p',
    );
    first.unmount();
    const second = render(<LeverControl lever={iht} value={-40} onChange={() => undefined} />);
    const select = within(second.container).getByRole('combobox');
    expect(select).toHaveValue('-40');
    expect(
      within(second.container).getByRole('option', { name: 'Abolish (0%)' }),
    ).toBeInTheDocument();
    expect(within(second.container).getByText('0%')).toBeInTheDocument();
    second.unmount();
    const third = render(<LeverControl lever={dhsc} value={2} onChange={() => undefined} />);
    // Spending leads with growth after rising prices, in words, and the plan beside it (Phase
    // 25); the desk keeps the cash budget beneath it.
    expect(
      within(third.container).getByText('Grows 3.9% a year after rising prices (planned: 2.9%)'),
    ).toBeInTheDocument();
    expect(third.container.querySelector('.lever__cash')?.textContent).toMatch(
      /£232\.0bn → £236\.6bn in 2028-29; growth measured from 2026-27 to 2028-29/,
    );
    expect(within(third.container).getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      'Grows 3.9% a year after rising prices, 2% more than planned',
    );
    third.unmount();
    // At rest: one plain line, as planned, and no pair of equal figures.
    const fourth = render(<LeverControl lever={dhsc} value={0} onChange={() => undefined} />);
    expect(
      within(fourth.container).getByText('Grows 2.9% a year after rising prices, as planned'),
    ).toBeInTheDocument();
    expect(within(fourth.container).getByText('10% less')).toBeInTheDocument();
    expect(within(fourth.container).getByText('10% more')).toBeInTheDocument();
    fourth.unmount();
    // A cut to a growing budget cannot read as a rise.
    const fifth = render(<LeverControl lever={dhsc} value={-1} onChange={() => undefined} />);
    expect(
      within(fifth.container).getByText(
        'Still grows 2.4% a year after rising prices (planned: 2.9%)',
      ),
    ).toBeInTheDocument();
    const third_ = fifth;
    // The Spending Review's own figure and the 2010s record sit beside the control, one click
    // away whatever the workings switch says.
    const milestones = third_.container.querySelector('.milestones')?.textContent ?? '';
    expect(milestones).toMatch(/For comparison/);
    expect(milestones).toMatch(/This Spending Review\+2\.8% a year/);
    expect(milestones).toMatch(/2010-11 to 2019-20\+1\.8% a year/);
  });

  it('a card that cannot start before the target year wears its earliest start and says when it begins', () => {
    const wealth2 = levers.find((l) => l.code === 'wealth2');
    if (!wealth2) throw new Error('missing wealth2');
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { wealth2: 1 } },
    });
    const { container } = render(
      <LeverControl
        lever={wealth2}
        value={1}
        effect={outcome.leverEffects.find((e) => e.code === 'wealth2')}
        summaryYear="2029-30"
        onChange={() => undefined}
      />,
    );
    const scope = within(container);
    const tag = scope.getByText('Earliest start').closest('.tag');
    expect(tag).toHaveClass('tag--quiet');
    expect(tag?.textContent).toMatch(/April 2030/);
    expect(tag?.textContent).toMatch(/January 2031/);
    const line = scope.getByText(/Day-to-day budget in 2029-30/);
    expect(line.textContent).toMatch(/nothing yet; from 2030-31 raises £18\.5bn/);
    fireEvent.click(scope.getByText('What this assumes'));
    // The reason appears twice on purpose: read aloud inside the tag, and listed under the disclosure.
    expect(
      scope.getAllByText(/Tax Policy Associates expects it to apply first in 2029-30/),
    ).toHaveLength(2);
  });
});
