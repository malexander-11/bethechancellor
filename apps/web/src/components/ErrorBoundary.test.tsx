import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

let fail = true;
function Screen() {
  if (fail) throw new Error('a fault while drawing');
  return <p>The screen</p>;
}

describe('a fault while drawing a screen (2026-09-30)', () => {
  // React reports every fault it catches; the report is expected here.
  beforeEach(() => {
    fail = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows a plain page with a way on, not a blank one', () => {
    render(
      <ErrorBoundary>
        <Screen />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'This page could not be shown' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'start a new Budget' })).toHaveAttribute('href', '/');
  });

  it('tries the screen again once the player moves', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="first">
        <Screen />
      </ErrorBoundary>,
    );
    expect(screen.queryByText('The screen')).toBeNull();
    fail = false;
    rerender(
      <ErrorBoundary resetKey="second">
        <Screen />
      </ErrorBoundary>,
    );
    expect(screen.getByText('The screen')).toBeInTheDocument();
  });
});
