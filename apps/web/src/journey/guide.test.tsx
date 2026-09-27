import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { glossary } from '../data';

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
  it('numbers the step, names the screen, says what to do in one line, and folds nothing beneath', () => {
    at(`/outlook?${BASE}`);
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your briefing' })).toBeVisible();
    expect(screen.getByText('The headroom you have, and the rules to meet.')).toBeInTheDocument();
    // The reason a screen matters is on the screen or nowhere (Phase 23).
    expect(screen.queryByText('Why this matters')).toBeNull();
    expect(intro().querySelector('details')).toBeNull();
    // No date and no countdown: a player does not need today's date to write a Budget.
    expect(document.querySelector('.dateline')).toBeNull();
    expect(screen.queryByText(/days to the Budget/)).toBeNull();
  });

  it('explains a word where it is used, and the badges at the foot of every page', () => {
    at(`/budget/spending?${BASE}`);
    const abbr = within(intro()).getByText('flagship', { selector: 'abbr.term' });
    expect(abbr).toHaveAttribute('title', glossary.terms.flagship?.short);
    // The five badges, in plain words, so "Official figure" is never only a tooltip.
    fireEvent.click(screen.getByText('What the badges mean'));
    const badges = screen.getByText('What the badges mean').closest('details') as HTMLElement;
    expect(within(badges).getByText('Official figure')).toBeInTheDocument();
    expect(within(badges).getByText('Worked out')).toBeInTheDocument();
    expect(within(badges).getByText('Game judgement')).toBeInTheDocument();
    expect(within(badges).getByText(/The game’s opinion/)).toBeInTheDocument();
  });

  it('follows the package’s screens, and the opening has a head of its own', () => {
    const first = at(`/budget/spending?${BASE}`);
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(screen.getByText(/Ministers will tell you/)).toBeInTheDocument();
    first.unmount();
    at(`/?${BASE}`);
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Build my Budget' })).toBeInTheDocument();
    expect(screen.getByText(/About 10 minutes/)).toBeInTheDocument();
    expect(screen.queryByText('No right answer')).toBeNull();
    expect(document.querySelector('.intro')).toBeNull();
  });

  it('keeps the header to the name and the two reference pages, and the utilities in the footer', () => {
    at(`/pm?${BASE}`);
    const header = document.querySelector('.site-header') as HTMLElement;
    expect(within(header).getByRole('link', { name: 'Be the Chancellor' })).toBeInTheDocument();
    expect(within(header).queryByText('Every number sourced')).toBeNull();
    expect(within(header).queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Dark mode' })).toBeNull();
    const footer = document.querySelector('footer.footer-note') as HTMLElement;
    expect(within(footer).getByRole('switch', { name: 'Show workings' })).toBeInTheDocument();
    const every = within(footer).getByRole('link', { name: 'Every lever' });
    expect(every).toHaveAttribute('href', expect.stringMatching(/^\/budget\/taxes\?/));
    // A Budget with no economy of its own opens the desk on today's estimate (Phase 24).
    expect(every).toHaveAttribute('href', expect.stringContaining('M=rate.0.75_rpi.0.5'));
    expect(within(footer).getByRole('link', { name: 'Sources and licence' })).toBeInTheDocument();
  });

  it('offers every lever only where the desk would open, and not from the desk or fine-tuning', () => {
    const desk = at(`/budget/taxes?${BASE}`);
    const footer = () => document.querySelector('footer.footer-note') as HTMLElement;
    expect(within(footer()).queryByRole('link', { name: 'Every lever' })).toBeNull();
    expect(within(footer()).getByRole('switch', { name: 'Show workings' })).toBeInTheDocument();
    desk.unmount();
    // A game reaches the desk at step 4: not from the priorities, and not twice on fine-tuning.
    const early = at(`/pm?${BASE}&g=st.1`);
    expect(within(footer()).queryByRole('link', { name: 'Every lever' })).toBeNull();
    early.unmount();
    const tuning = at(`/finetune/tax?${BASE}&g=st.3_pr.defence`);
    expect(within(footer()).queryByRole('link', { name: 'Every lever' })).toBeNull();
    tuning.unmount();
    at(`/review?${BASE}&g=st.4_pr.defence`);
    expect(within(footer()).getByRole('link', { name: 'Every lever' })).toBeInTheDocument();
  });
});
