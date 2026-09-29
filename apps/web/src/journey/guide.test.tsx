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
    expect(
      screen.getByText(
        'The headroom you have to play with, and the rules you need to meet to keep markets onside.',
      ),
    ).toBeInTheDocument();
    // The reason a screen matters is on the screen or nowhere (Phase 23).
    expect(screen.queryByText('Why this matters')).toBeNull();
    expect(intro().querySelector('details')).toBeNull();
    // No date and no countdown: a player does not need today's date to write a Budget.
    expect(document.querySelector('.dateline')).toBeNull();
    expect(screen.queryByText(/days to the Budget/)).toBeNull();
  });

  it('explains a word where it is used, and the badges at the foot of every page', () => {
    at(`/outlook?${BASE}`);
    // A tap opens the definition beside the word, and Escape closes it (Phase 25): a phone has
    // no hover, so a tooltip alone was out of reach. Headroom is the first word a newcomer must
    // know, and the briefing explains it where it is used.
    const word = screen.getByRole('button', { name: 'Headroom' });
    const term = word.closest('.term') as HTMLElement;
    const short = `(${glossary.terms.headroom?.short})`;
    expect(word).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(word);
    expect(word).toHaveAttribute('aria-expanded', 'true');
    expect(within(term).getByText(short)).toBeInTheDocument();
    fireEvent.keyDown(word, { key: 'Escape' });
    expect(word).toHaveAttribute('aria-expanded', 'false');
    expect(within(term).queryByText(short)).toBeNull();
    // A badge opens the key at the foot of the page on its own line.
    const badge = document.querySelector('main a.badge--direct') as HTMLAnchorElement | null;
    const key = document.getElementById('badge-key') as HTMLDetailsElement;
    expect(key.open).toBe(false);
    if (badge) {
      expect(badge).toHaveAttribute('href', '#badge-key');
      expect(badge).toHaveAttribute('tabindex', '-1');
      fireEvent.click(badge);
      expect(key.open).toBe(true);
      key.open = false;
    }
    // The five badges, in plain words, so "Official figure" is never only a tooltip.
    fireEvent.click(screen.getByText('What the badges mean'));
    const badges = screen.getByText('What the badges mean').closest('details') as HTMLElement;
    expect(within(badges).getByText('Official figure')).toBeInTheDocument();
    expect(within(badges).getByText('Worked out')).toBeInTheDocument();
    expect(within(badges).getByText('Game judgement')).toBeInTheDocument();
    expect(within(badges).getByText(/The game’s opinion/)).toBeInTheDocument();
  });

  it('follows step 4’s screens, and the opening has a head of its own', () => {
    const first = at(`/finetune/spending?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(
      screen.getByText(/Your Director of Public Spending’s view is on each lever\./),
    ).toBeInTheDocument();
    first.unmount();
    at(`/?${BASE}`);
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Build my Budget' })).toBeInTheDocument();
    expect(screen.getByText(/About 9 minutes/)).toBeInTheDocument();
    expect(screen.queryByText('No right answer')).toBeNull();
    expect(document.querySelector('.intro')).toBeNull();
  });

  it('keeps the header to the name and the two reference pages, and the utilities in the footer', () => {
    at(`/pm?${BASE}`);
    const header = document.querySelector('.site-header') as HTMLElement;
    expect(within(header).getByRole('link', { name: 'What’s your Budget?' })).toBeInTheDocument();
    expect(within(header).queryByText('Every number sourced')).toBeNull();
    expect(within(header).queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Dark mode' })).toBeNull();
    const footer = document.querySelector('footer.footer-note') as HTMLElement;
    expect(within(footer).getByRole('switch', { name: 'Show workings' })).toBeInTheDocument();
    // Basic and advanced (Phase 27): a second switch, beside the workings.
    expect(within(footer).getByRole('switch', { name: 'Advanced mode' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Sources and licence' })).toBeInTheDocument();
  });

  it('offers no way round step 4: no screen links to every lever (Phase 26)', () => {
    // Every lever is a policy on step 4, so the desk and the links to it have gone: from the
    // footer, from fine-tuning and from everywhere else.
    const estimate = 'M=rate.0.75_rpi.0.5';
    for (const path of [
      `/outlook?${BASE}`,
      `/pm?${BASE}&g=st.1&${estimate}`,
      `/finetune/tax?${BASE}&g=st.3_pr.defence&${estimate}`,
      `/finetune/spending?${BASE}&g=st.3_pr.defence&${estimate}`,
      `/review?${BASE}&g=st.4_pr.defence&${estimate}`,
    ]) {
      const view = at(path);
      expect(screen.queryByRole('link', { name: /Every (tax |spending )?lever/ }), path).toBeNull();
      view.unmount();
    }
  });
});
