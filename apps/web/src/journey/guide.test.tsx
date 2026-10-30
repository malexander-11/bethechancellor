import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget, finetune, glossary } from '../data';
import { BUDGET_TEXT } from '../pages/Budget';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
/** A game just begun: fine-tuning, where the road starts (ADR-0045). */
const GAME = 'g=st.0_rd.2';
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
    at(`/finetune/spending?${BASE}&${GAME}`);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText(/^Fine-tune tax and spend · 2 of 2$/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Fine-tune spending' })).toBeVisible();
    expect(screen.getByText(finetune.spending.lead)).toBeInTheDocument();
    // The reason a screen matters is on the screen or nowhere (Phase 23).
    expect(screen.queryByText('Why this matters')).toBeNull();
    expect(intro().querySelector('details')).toBeNull();
    // No date and no countdown: a player does not need today's date to change a Budget.
    expect(document.querySelector('.dateline')).toBeNull();
    expect(screen.queryByText(/days to the Budget/)).toBeNull();
  });

  it('explains a word where it is used', () => {
    // A tap opens the definition beside the word, and Escape closes it (Phase 25): a phone has
    // no hover, so a tooltip alone was out of reach. A budget's row tags the Barnett formula.
    at(`/finetune/spending?${BASE}&${GAME}`);
    fireEvent.click(screen.getByRole('button', { name: /^Change health, schools and defence/ }));
    const word = screen.getAllByRole('button', { name: 'Barnett applies' })[0] as HTMLElement;
    const term = word.closest('.term') as HTMLElement;
    const short = `(${glossary.terms.barnett?.short})`;
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
    const view = at(`/finetune/tax?${BASE}&${GAME}`);
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

  it('opens on the Chancellor’s Budget, which is no step and shows no road (ADR-0045)', () => {
    at(`/?${BASE}`);
    expect(screen.queryByRole('navigation', { name: 'Budget steps' })).toBeNull();
    expect(screen.queryByText(/Step \d of 3/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: budget.title })).toBeVisible();
    // Its head names the Chancellor once, as a fact of the Budget, and says what the page is.
    expect(intro().textContent).toContain(budget.chancellor.name);
    // What the Chancellor did, the measures, and one button to change them; under it a quiet way
    // to the leaderboard (ADR-0044). No cover, no countdown, no bullets (ADR-0032).
    expect(screen.getByRole('heading', { level: 2, name: BUDGET_TEXT.story })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: BUDGET_TEXT.measures }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: BUDGET_TEXT.start })).toHaveClass('btn--primary');
    expect(screen.getByRole('link', { name: 'See the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard',
    );
    expect(document.querySelector('.opening')).toBeNull();
    expect(document.querySelector('.shell--cover')).toBeNull();
    expect(screen.queryByText(/minutes/)).toBeNull();
    expect(screen.queryByText('No right answer')).toBeNull();
    // The screens of the game are as long as what they hold: nothing fills the window.
    expect(document.querySelector('.shell main')).not.toBeNull();
  });

  it('keeps the header to the name, and the footer to two quiet links', () => {
    at(`/?${BASE}`);
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

  it('offers no way round fine-tuning: no screen links to every lever (Phase 26)', () => {
    // Every lever is a policy on the fine-tuning screens, so the desk and the links to it have
    // gone: from the footer, from fine-tuning and from everywhere else.
    for (const path of [
      `/?${BASE}`,
      `/finetune/tax?${BASE}&${GAME}`,
      `/finetune/spending?${BASE}&${GAME}`,
      `/review?${BASE}&g=st.1_rd.2`,
      `/budget-day?${BASE}&g=st.1_rd.2`,
    ]) {
      const view = at(path);
      expect(screen.queryByRole('link', { name: /Every (tax |spending )?lever/ }), path).toBeNull();
      view.unmount();
    }
  });
});
