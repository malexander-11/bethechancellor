import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the guide at the top of every step', () => {
  it('numbers the step, names it, and says what to do', () => {
    at(`/outlook?${BASE}`);
    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Choose what to plan on' })).toBeVisible();
    expect(screen.getByText('What you’re doing')).toBeInTheDocument();
    expect(screen.getByText('Do now')).toBeInTheDocument();
    expect(screen.getByText(/Choose one of the four cards/)).toBeInTheDocument();
  });

  it('explains the words a newcomer will not know, on hover and in a list', () => {
    at(`/outlook?${BASE}`);
    const abbr = screen.getAllByText('headroom', { selector: 'abbr.term' })[0];
    expect(abbr).toHaveAttribute('title', expect.stringMatching(/safety margin/));
    fireEvent.click(screen.getByText('Words on this page'));
    const list = screen.getByText('Words on this page').closest('details') as HTMLElement;
    expect(within(list).getByText('Headroom')).toBeInTheDocument();
    expect(within(list).getByText('The OBR')).toBeInTheDocument();
    expect(within(list).getByText('Gilts')).toBeInTheDocument();
  });

  it('follows the desk’s screens and the seven-stop rail', () => {
    const first = at(`/budget/spending?${BASE}`);
    expect(screen.getByText('Step 4 of 7')).toBeInTheDocument();
    expect(screen.getByText(/Ministers will tell you/)).toBeInTheDocument();
    const rail = screen.getByRole('navigation', { name: 'Budget steps' });
    expect(within(rail).getAllByRole('listitem')).toHaveLength(7);
    // The desk is where you are: marked, not a link. The outlook is behind you: a link. The
    // forecast is ahead, and a sandbox has no forecast to go to: inert.
    expect(within(rail).getByText('The package').closest('[aria-current="step"]')).not.toBeNull();
    expect(within(rail).getByRole('link', { name: /The outlook/ })).toBeInTheDocument();
    expect(within(rail).queryByRole('link', { name: /The forecast/ })).toBeNull();
    first.unmount();
    at(`/?${BASE}`);
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'You have been appointed Chancellor.' }),
    ).toBeInTheDocument();
  });
});
