import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { finetune, glossary } from '../data';

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

  it('explains a word where it is used', () => {
    // A tap opens the definition beside the word, and Escape closes it (Phase 25): a phone has
    // no hover, so a tooltip alone was out of reach. The briefing is plain copy (ADR-0031); the
    // priorities explain the manifesto where they name it.
    at(`/pm?${BASE}&g=st.1&M=rate.0.75_rpi.0.5`);
    const word = screen.getByRole('button', { name: 'manifesto' });
    const term = word.closest('.term') as HTMLElement;
    const short = `(${glossary.terms.manifesto?.short})`;
    expect(word).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(word);
    expect(word).toHaveAttribute('aria-expanded', 'true');
    expect(within(term).getByText(short)).toBeInTheDocument();
    fireEvent.keyDown(word, { key: 'Escape' });
    expect(word).toHaveAttribute('aria-expanded', 'false');
    expect(within(term).queryByText(short)).toBeNull();
  });

  it('wears no badge, and says the five kinds of number in words on About and Methodology', async () => {
    // No screen labels a figure (ADR-0034).
    const view = at(`/outlook?${BASE}`);
    expect(document.querySelector('.badge')).toBeNull();
    expect(screen.queryByText('What the badges mean')).toBeNull();
    view.unmount();
    // The five kinds, a sentence each, on the page the footer links to (ADR-0033), which links on
    // to the Methodology page's fuller account.
    const about = at('/about');
    await screen.findByRole('heading', { level: 1, name: 'About the game & sources' });
    const kinds = [...document.querySelectorAll('.kinds li')];
    expect(kinds.map((li) => li.textContent)).toEqual([
      'An official figure is one HMRC, HM Treasury or the OBR published, shown with its working.',
      'A worked-out figure is arithmetic on official figures, with no judgement in it.',
      'An assumption is a number we chose, using published sensitivities where they exist.',
      'Commentary is words about an effect, with sources, and never a number of our own.',
      'A game judgement is the game’s opinion, in a role’s voice. It quotes sources and never makes a number.',
    ]);
    expect(document.querySelector('.badge')).toBeNull();
    expect(screen.getByRole('link', { name: 'How the numbers work, in full' })).toHaveAttribute(
      'href',
      '/methodology',
    );
    about.unmount();
    at('/methodology');
    const heading = await screen.findByRole('heading', { name: 'Five kinds of number' });
    // A line on why nothing on screen is labelled, then the table of the five kinds in words.
    const intro = heading.nextElementSibling as HTMLElement;
    expect(intro).toHaveTextContent(/The screens do not label them \(ADR-0034\)/);
    const table = intro.nextElementSibling as HTMLElement;
    expect(table.tagName).toBe('TABLE');
    expect(document.querySelector('.badge')).toBeNull();
    for (const label of [
      'Official figure',
      'Worked out',
      'Assumption',
      'Commentary',
      'Game judgement',
    ]) {
      expect(within(table).getByText(label), label).toBeInTheDocument();
    }
    // And the way back to the page that leads to it.
    expect(screen.getByRole('link', { name: 'Back to About the game & sources' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('follows step 4’s screens, and the cover is an invitation with no road', () => {
    const first = at(`/finetune/spending?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(screen.getByText(finetune.spending.lead)).toBeInTheDocument();
    first.unmount();
    at(`/?${BASE}`);
    // The invitation to play, not a step (ADR-0033): no count, no step's name and no road.
    expect(screen.queryByRole('navigation', { name: 'Budget steps' })).toBeNull();
    expect(screen.queryByText(/Step \d of 6/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'It’s your Budget now.' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Build my Budget' })).toBeInTheDocument();
    // The Budget box, the premise and the button, and under it a quiet way to the leaderboard
    // (ADR-0044), nothing else: no line above the heading and no bullets (ADR-0032), and the box a
    // drawing with no words, hidden from a screen reader.
    const opening = document.querySelector('.opening') as HTMLElement;
    expect(opening.textContent).toBe(
      'It’s your Budget now.Choose what matters, decide who pays, and see what the country makes of it.Build my BudgetSee the leaderboard',
    );
    expect(within(opening).getByRole('link', { name: 'See the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard',
    );
    const art = opening.querySelectorAll('svg');
    expect(art).toHaveLength(1);
    expect(art[0]).toHaveAttribute('aria-hidden', 'true');
    expect(art[0]?.querySelector('text, title')).toBeNull();
    expect(screen.queryByText(/minutes/)).toBeNull();
    expect(screen.queryByText('No right answer')).toBeNull();
    expect(document.querySelector('.intro')).toBeNull();
    // The cover alone fills the screen, its invitation centred above the footer (ADR-0033,
    // revised); the screens of the game are as long as what they hold.
    expect(document.querySelector('.shell--cover main')).not.toBeNull();
  });

  it('fills the screen on the cover alone', () => {
    at(`/outlook?${BASE}`);
    expect(document.querySelector('.shell main')).not.toBeNull();
    expect(document.querySelector('.shell--cover')).toBeNull();
  });

  it('keeps the header to the name, and the footer to two quiet links', () => {
    at(`/pm?${BASE}`);
    // The header is the name, the way home, and nothing else (ADR-0032).
    const header = document.querySelector('.site-header') as HTMLElement;
    expect(
      within(header)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['What’s your Budget?']);
    expect(within(header).queryByRole('navigation')).toBeNull();
    // The footer: a link to the page about the game, its numbers, sources and licence
    // (ADR-0033), and one to the leaderboard (ADR-0044), with no switch, no key and no line of its
    // own.
    const footer = document.querySelector('footer.site-footer') as HTMLElement;
    const links = within(footer).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['About the game & sources', '/about'],
      ['Leaderboard', '/leaderboard'],
    ]);
    expect(footer.textContent).toBe('About the game & sourcesLeaderboard');
    expect(screen.queryByRole('switch')).toBeNull();
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
