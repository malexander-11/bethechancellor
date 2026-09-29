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

  it('names each badge in plain words, and the Methodology page says what each means', () => {
    // With the workings on, as the shared setup has them, the briefing wears its badges.
    const view = at(`/outlook?${BASE}`);
    // A badge is a plain label with its meaning in its title: the key it opened at the foot of
    // the page went when the footer became one row of links (ADR-0032).
    const badge = document.querySelector('main .badge--direct') as HTMLElement;
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveAttribute('title', expect.stringMatching(/^A figure HMRC/));
    expect(document.getElementById('badge-key')).toBeNull();
    expect(screen.queryByText('What the badges mean')).toBeNull();
    view.unmount();
    // The five badges, in plain words, one link away in the footer.
    at('/methodology');
    const kinds = screen.getByRole('heading', { name: 'Five kinds of number' });
    const table = kinds.nextElementSibling as HTMLElement;
    for (const label of [
      'Official figure',
      'Worked out',
      'Assumption',
      'Commentary',
      'Game judgement',
    ]) {
      expect(within(table).getByText(label), label).toBeInTheDocument();
    }
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
    // The premise and the button, nothing else (ADR-0032): no line above the heading, no bullets
    // and no picture.
    const opening = document.querySelector('.opening') as HTMLElement;
    expect(opening.textContent).toBe(
      'It’s your Budget now.Choose what matters, decide who pays, and see what the country makes of it.Build my Budget',
    );
    expect(opening.querySelector('svg')).toBeNull();
    expect(screen.queryByText(/minutes/)).toBeNull();
    expect(screen.queryByText('No right answer')).toBeNull();
    expect(document.querySelector('.intro')).toBeNull();
  });

  it('keeps the header to the name, and the footer to one row of links', () => {
    at(`/pm?${BASE}`);
    // The header is the name, the way home, and nothing else (ADR-0032).
    const header = document.querySelector('.site-header') as HTMLElement;
    expect(
      within(header)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['What’s your Budget?']);
    expect(within(header).queryByRole('navigation')).toBeNull();
    // The footer: the two reference pages and the sources and licence, with no switch, no key
    // and no line of its own.
    const footer = document.querySelector('footer.site-footer') as HTMLElement;
    const links = within(footer).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Methodology', '/methodology'],
      ['About & sources', '/about'],
      ['Sources and licence', '/about#licences'],
    ]);
    expect(footer.textContent).toBe('MethodologyAbout & sourcesSources and licence');
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
