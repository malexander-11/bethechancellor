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
    expect(scope.getByText(/Barnett formula/)).toBeInTheDocument();
    const current = scope.getByText(/Current budget in 2029-30/);
    expect(current.textContent).toMatch(/2\.4bn/);
    fireEvent.click(scope.getByRole('button', { name: /Where does this number come from/ }));
    expect(scope.getByText(/Spending Review 2025 rows/)).toBeInTheDocument();
    expect(scope.getAllByText(/extended from 2028-29/)).toHaveLength(2);
    // Only the "increase" Barnett note applies at +1%.
    expect(scope.getAllByText(/would also raise those block grants/)).toHaveLength(1);
    expect(scope.queryByText(/would also cut those block grants/)).toBeNull();
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
});
