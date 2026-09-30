import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

/** A link from elsewhere in the game to one part of the About page. */
function LinkToLicences() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/about#licences')}>To the licences</button>;
}

describe('the reference pages, loaded when opened (2026-09-30)', () => {
  // First in its file, so the About page's code has not loaded when the page opens.
  it('opens a link to part of a page on that part, once the page is drawn', async () => {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.id);
    };
    try {
      window.history.replaceState(null, '', '/about#licences');
      render(
        <MemoryRouter initialEntries={['/about#licences']}>
          <App />
        </MemoryRouter>,
      );
      await waitFor(() => expect(scrolled).toContain('licences'));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('takes a link from another screen to that part, and focus with it', async () => {
    window.history.replaceState(null, '', '/');
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LinkToLicences />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'To the licences' }));
    await waitFor(() => {
      const licences = document.getElementById('licences');
      expect(licences).not.toBeNull();
      expect(document.activeElement).toBe(licences);
    });
  });

  it('opens the Methodology page', async () => {
    window.history.replaceState(null, '', '/methodology');
    render(
      <MemoryRouter initialEntries={['/methodology']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How the numbers work' }),
    ).toBeInTheDocument();
  });
});
