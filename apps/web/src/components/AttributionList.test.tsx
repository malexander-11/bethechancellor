import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttributionList } from './AttributionList';

describe('AttributionList', () => {
  it('shows current budget and borrowing columns, with investment only in the second', () => {
    render(
      <AttributionList
        rows={[
          {
            kind: 'lever',
            code: 'cdel',
            label: 'Public investment',
            badge: 'mechanical',
            currentBudgetGbpm: 0,
            psnbGbpm: 13420,
          },
          {
            kind: 'lever',
            code: 'dhsc',
            label: 'Health and Social Care',
            badge: 'mechanical',
            currentBudgetGbpm: 2369,
            psnbGbpm: 2369,
          },
          {
            kind: 'debtInterest',
            label: 'Debt interest on extra borrowing',
            badge: 'mechanical',
            currentBudgetGbpm: 900,
            psnbGbpm: 900,
          },
        ]}
        baselineHeadroomGbpm={23600}
      />,
    );
    expect(screen.getByText('Current budget')).toBeInTheDocument();
    expect(screen.getByText('Borrowing')).toBeInTheDocument();
    const investment = screen.getByText('Public investment').closest('li');
    expect(investment?.textContent).toMatch(/0\.0bn/);
    expect(investment?.textContent).toMatch(/13\.4bn/);
    const items = screen.getAllByRole('listitem');
    expect(items[1]?.textContent).toContain('Public investment');
    expect(items[items.length - 2]?.textContent).toContain('Debt interest');
    expect(items[items.length - 1]?.textContent).toMatch(/Total/);
    expect(items[items.length - 1]?.textContent).toMatch(/3\.3bn/);
    expect(items[items.length - 1]?.textContent).toMatch(/16\.7bn/);
  });

  it('explains the baseline headroom when nothing has moved', () => {
    render(<AttributionList rows={[]} baselineHeadroomGbpm={23600} />);
    expect(screen.getByText(/Nothing yet/).textContent).toMatch(/23\.6bn/);
  });
});
