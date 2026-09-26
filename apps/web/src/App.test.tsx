import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('journey routes', () => {
  it('opens on one sentence, the playtime and the one button', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByText(/About 10 minutes/)).toBeInTheDocument();
    const go = screen.getByRole('link', { name: 'Build my Budget' });
    expect(go).toHaveAttribute('href', expect.stringMatching(/^\/outlook/));
    // No tutorial, no adviser essays: the advisers wait for the screens where they matter.
    expect(screen.queryByText('Permanent Secretary to the Treasury')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
  });

  it('redirects old /b links into the package with the scorecard, on the first of its two parts', () => {
    render(
      <MemoryRouter initialEntries={['/b?v=1&f=obr2603&r=ch2602&i=2027&L=itbr.1']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    // No tab bar: one road. The progress line says which part this is, the button says what is next.
    expect(screen.queryByRole('link', { name: 'Taxes' })).toBeNull();
    expect(screen.getByText(/^Build your Budget · 1 of 2$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next: the spending' })).toBeInTheDocument();
    expect(screen.getByText(/Headroom, 2029-30/)).toBeInTheDocument();
    expect(screen.getByText('Budget 2025 decisions')).toBeInTheDocument();
  });

  it('names each screen in the tab title and puts a skip link first in the tab order', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/outlook']}>
        <App />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Your starting position · Step 2 of 7 · Be the Chancellor');
    const skip = screen.getByRole('link', { name: 'Skip to the step' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.body.querySelector('a, button, input, [tabindex]')).toBe(skip);
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1');
    unmount();
    render(
      <MemoryRouter initialEntries={['/budget/taxes']}>
        <App />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Build the package (the taxes) · Step 4 of 7 · Be the Chancellor');
  });

  it('moves focus to the new screen when a step link is followed', () => {
    render(
      <MemoryRouter initialEntries={['/budget/taxes?v=1&f=obr2603&r=ch2602&i=2027&L=itbr.1']}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Next: the spending' }));
    expect(document.title).toBe(
      'Build the package (the spending) · Step 4 of 7 · Be the Chancellor',
    );
    expect(document.activeElement).toBe(document.getElementById('main'));
  });

  it('shows the assumptions step as a choice of forecasts, and Budget day with the verdicts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/assumptions']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Your starting position')).toBeInTheDocument();
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
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    expect(screen.getAllByText('Rule met').length).toBeGreaterThanOrEqual(2);
  });
});
