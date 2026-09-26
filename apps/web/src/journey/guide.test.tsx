import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const intro = () => document.querySelector('.intro') as HTMLElement;

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the head of every screen', () => {
  it('numbers the step, names the screen, and says what to do in one line', () => {
    at(`/outlook?${BASE}`);
    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your starting position' })).toBeVisible();
    expect(screen.getByText(/Choose the forecast you’ll plan on/)).toBeInTheDocument();
    // The reason and the words wait behind one line.
    expect(screen.getByText(/A rosier forecast gives you more to spend now/)).not.toBeVisible();
    fireEvent.click(within(intro()).getByText('Why this matters'));
    expect(screen.getByText(/A rosier forecast gives you more to spend now/)).toBeVisible();
  });

  it('explains the words a newcomer will not know, on hover and in the same fold', () => {
    at(`/outlook?${BASE}`);
    const abbr = screen.getAllByText('headroom', { selector: 'abbr.term' })[0];
    expect(abbr).toHaveAttribute('title', expect.stringMatching(/safety margin/));
    fireEvent.click(within(intro()).getByText('Why this matters'));
    const fold = within(intro()).getByText('Why this matters').closest('details') as HTMLElement;
    expect(within(fold).getByText('Headroom')).toBeInTheDocument();
    expect(within(fold).getByText('The OBR')).toBeInTheDocument();
    expect(within(fold).getByText('Gilts')).toBeInTheDocument();
    // The five badges too, at the foot of every page, so "Direct costing" is never only a tooltip.
    fireEvent.click(screen.getByText('What the badges mean'));
    const badges = screen.getByText('What the badges mean').closest('details') as HTMLElement;
    expect(within(badges).getByText('Simulated')).toBeInTheDocument();
    expect(within(badges).getByText(/A game judgement/)).toBeInTheDocument();
  });

  it('follows the package’s screens, and the opening has a head of its own', () => {
    const first = at(`/budget/spending?${BASE}`);
    expect(screen.getByText('Step 4 of 7')).toBeInTheDocument();
    expect(screen.getByText(/^Build your Budget · 2 of 2$/)).toBeInTheDocument();
    expect(screen.getByText(/Ministers will tell you/)).toBeInTheDocument();
    first.unmount();
    at(`/?${BASE}`);
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Build my Budget' })).toBeInTheDocument();
    expect(screen.getByText(/About 10 minutes/)).toBeInTheDocument();
    expect(document.querySelector('.intro')).toBeNull();
  });
});
