import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { sources } from '../data';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the page about the game and its sources (ADR-0033)', () => {
  it('is the footer’s one link, and says what is on it before it says anything else', () => {
    at('/about');
    expect(
      screen.getByRole('heading', { level: 1, name: 'About the game & sources' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('About the game & sources · What’s your Budget?');
    const contents = screen.getByRole('navigation', { name: 'On this page' });
    const parts = within(contents)
      .getAllByRole('link')
      .map((a) => [a.textContent, a.getAttribute('href')]);
    expect(parts).toEqual([
      ['The game', '/about#game'],
      ['How the numbers work', '/about#numbers'],
      ['What the game does not do', '/about#limits'],
      ['Licence and attribution', '/about#licences'],
      ['Sources', '/about#sources'],
    ]);
    // Each line of the contents names a part of the page, headed in the same words.
    for (const [title, href] of parts) {
      const id = href?.split('#')[1] ?? '';
      expect(document.getElementById(id), title ?? '').toHaveTextContent(title ?? '');
      expect(document.getElementById(id)?.tagName).toBe('H2');
    }
  });

  it('keeps everything the footer’s three links led to', () => {
    at('/about');
    // The credit to the tool it follows, and whose name it shared.
    expect(screen.getByText(/Institute for Fiscal Studies and Nesta/)).toHaveTextContent(
      /whose name it shared until September 2026/,
    );
    // The baseline, the licences and the disclaimer of any affiliation.
    expect(screen.getByRole('heading', { name: 'Current baseline' })).toBeInTheDocument();
    const licence = screen.getByRole('heading', { name: 'Licence and attribution' })
      .nextElementSibling as HTMLElement;
    expect(licence).toHaveTextContent(/Code is MIT licensed/);
    expect(licence).toHaveTextContent(/Open Government Licence v3\.0/);
    expect(licence).toHaveTextContent(/Not affiliated with HM Treasury, the OBR, HMRC, the IFS/);
    // Every source, each with its link and the date it was retrieved.
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
    const rows = document.querySelectorAll('main table tbody tr');
    expect(rows).toHaveLength(sources.sources.length);
    expect(rows[0]?.querySelector('a[rel="noreferrer"]')).not.toBeNull();
    // The methodology, one link on.
    expect(screen.getByRole('link', { name: 'How the numbers work, in full' })).toHaveAttribute(
      'href',
      '/methodology',
    );
  });

  it('takes a reader, and their focus, to the part they pick', () => {
    at('/about');
    const contents = screen.getByRole('navigation', { name: 'On this page' });
    fireEvent.click(within(contents).getByRole('link', { name: 'Licence and attribution' }));
    expect(document.activeElement).toBe(document.getElementById('licences'));
  });
});
