import { computeOutcome } from '@btc/engine';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { levers, rules, vintage } from '../data';
import { Scorecard } from './Scorecard';

describe('Scorecard', () => {
  it('shows headroom, the three rules and four aggregates as March → yours', () => {
    const outcome = computeOutcome({
      vintage,
      rules,
      levers,
      settings: { leverValues: { cdel: 10, rv2ch: 1, rvpip: 1 } },
    });
    render(<Scorecard outcome={outcome} typicalErrorGbpm={33000} />);
    expect(screen.getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    expect(screen.getByText('Fiscal rules')).toBeInTheDocument();
    for (const label of ['Budget balance', 'Borrowing', 'Debt', 'Deficit']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/Stability/)).toBeInTheDocument();
    expect(screen.getByText(/Welfare cap/)).toBeInTheDocument();
    // March borrowing in 2029-30 was £63.4bn; investment adds to it.
    expect(screen.getByText('March: £63.4bn')).toBeInTheDocument();
    const borrowingCell = screen.getByText('Borrowing').closest('.scorecard__cell');
    expect(borrowingCell?.textContent).toMatch(/£7\d\.\dbn/);
  });
});
