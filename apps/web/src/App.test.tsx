import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('journey routes', () => {
  it('starts with the appointment and the advisers', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('You have been appointed Chancellor.')).toBeInTheDocument();
    expect(
      screen.getAllByText('Permanent Secretary to the Treasury').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('redirects old /b links into the desk with the scorecard and its three tabs', () => {
    render(
      <MemoryRouter initialEntries={['/b?v=1&f=obr2603&r=ch2602&i=2027&L=itbr.1']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Taxes' })).toHaveClass('tab--active');
    expect(screen.getByRole('link', { name: 'Spending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Policies' })).toBeInTheDocument();
    expect(screen.getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    expect(screen.getByText('Budget 2025 decisions')).toBeInTheDocument();
  });

  it('shows the assumptions step as a choice of forecasts, and Budget day with the verdicts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/assumptions']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Choose what to plan on')).toBeInTheDocument();
    // One screen: the four forecasts you can budget on are on the page at once.
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    const cards = screen.getByRole('radiogroup', { name: 'Economic assumptions' });
    expect(within(cards).getAllByRole('radio')).toHaveLength(4);
    expect(within(cards).getByRole('radio', { name: /Keep the March baseline/ })).toBeChecked();
    unmount();
    render(
      <MemoryRouter initialEntries={['/budget-day']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Deliver the Budget')).toBeInTheDocument();
    // The close, with the workings behind the verdict, is the third beat.
    for (let i = 0; i < 2; i += 1)
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('Your measures')).toBeInTheDocument();
    expect(screen.getAllByText('Rule met').length).toBeGreaterThanOrEqual(2);
  });
});
