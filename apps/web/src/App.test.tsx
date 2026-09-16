import { fireEvent, render, screen } from '@testing-library/react';
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

  it('redirects old /b links into the taxes step with the scorecard and both tabs', () => {
    render(
      <MemoryRouter initialEntries={['/b?v=1&f=obr2603&r=ch2602&i=2027&L=itbr.1']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Step 2 · Set taxes and spending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Taxes' })).toHaveClass('tab--active');
    expect(screen.getByRole('link', { name: 'Spending' })).toBeInTheDocument();
    expect(screen.getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    expect(screen.getByText('Budget 2025 decisions')).toBeInTheDocument();
  });

  it('shows the assumptions step with the advisers’ suggestions and Budget day with the verdicts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/assumptions']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Step 1 · Confirm the assumptions')).toBeInTheDocument();
    // Beat 0 is the adviser arriving; the readings and the shortcuts are behind Continue.
    expect(screen.queryByText(/Take the advisers/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText(/Take the advisers/)).toBeInTheDocument();
    expect(screen.getAllByText(/Advisers suggest/).length).toBeGreaterThanOrEqual(3);
    unmount();
    render(
      <MemoryRouter initialEntries={['/budget-day']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Step 4 · Budget day')).toBeInTheDocument();
    // Beat 1: the workings behind the verdict, once you have read the room.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('Your measures')).toBeInTheDocument();
    expect(screen.getAllByText('Rule met').length).toBeGreaterThanOrEqual(2);
  });
});
