import { computeOutcome } from '@btc/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { levers, rules, vintage } from '../data';
import { formatLeverValue, LeverControl } from './LeverControl';

describe('LeverControl', () => {
  it('renders a reversal toggle as a checkbox that reports 1 or 0', () => {
    const lever = levers.find((l) => l.code === 'rvfrz');
    if (!lever) throw new Error('missing toggle lever');
    const onChange = vi.fn();
    render(<LeverControl lever={lever} value={0} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: /End the personal tax threshold freeze/ });
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByText('Direct costing')).toBeInTheDocument();
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
    const borrowing = screen.getByText(/Borrowing in 2029-30/);
    expect(borrowing.textContent).toMatch(/13\.4bn/);
    expect(borrowing.textContent).toMatch(/current budget unchanged/);
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
    const current = scope.getByText(/Current budget in 2029-30/);
    expect(current.textContent).toMatch(/2\.4bn/);
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
    const funded = render(
      <LeverControl
        lever={moj}
        value={10}
        onChange={() => undefined}
        promised={{
          title: 'A Justice uplift for prison capacity',
          target: '+10%',
          status: 'funded',
        }}
      />,
    );
    expect(within(funded.container).getByText('Promised to the PM')).toBeInTheDocument();
    funded.unmount();
    const pulled = render(
      <LeverControl
        lever={moj}
        value={4}
        onChange={() => undefined}
        promised={{
          title: 'A Justice uplift for prison capacity',
          target: '+10%',
          status: 'part-funded',
        }}
      />,
    );
    expect(within(pulled.container).getByText('Below what you promised the PM')).toHaveClass(
      'tag--warn',
    );
  });

  it('formats pence, points, per cent and pounds', () => {
    const itbr = levers.find((l) => l.code === 'itbr');
    const nicm = levers.find((l) => l.code === 'nicm');
    const fuel = levers.find((l) => l.code === 'fuel');
    const nicpt = levers.find((l) => l.code === 'nicpt');
    if (!itbr || !nicm || !fuel || !nicpt) throw new Error('missing levers');
    expect(formatLeverValue(itbr, -1)).toBe('−1p');
    expect(formatLeverValue(nicm, 0.5)).toBe('+0.5 pp');
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
    expect(within(first.container).getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      '21% (+1p)',
    );
    first.unmount();
    const second = render(<LeverControl lever={iht} value={-40} onChange={() => undefined} />);
    const select = within(second.container).getByRole('combobox');
    expect(select).toHaveValue('-40');
    expect(
      within(second.container).getByRole('option', { name: 'Abolish (0%) · not on the table' }),
    ).toBeInTheDocument();
    expect(within(second.container).getByText('0%')).toBeInTheDocument();
    second.unmount();
    const third = render(<LeverControl lever={dhsc} value={2} onChange={() => undefined} />);
    // Spending leads with real-terms growth and shows the cash budget beneath it.
    expect(within(third.container).getByText('+2.9%')).toBeInTheDocument();
    expect(within(third.container).getByText('+3.9%')).toBeInTheDocument();
    expect(third.container.querySelector('.lever__level-note')?.textContent).toMatch(
      /a year in real terms, 2026-27 to 2028-29/,
    );
    expect(third.container.querySelector('.lever__cash')?.textContent).toMatch(
      /£232\.0bn → £236\.6bn in 2028-29/,
    );
    // The Spending Review's own figure and the 2010s record sit beside the control.
    const milestones = third.container.querySelector('.milestones')?.textContent ?? '';
    expect(milestones).toMatch(/This Spending Review\+2\.8% a year/);
    expect(milestones).toMatch(/2010-11 to 2019-20\+1\.8% a year/);
  });
});
