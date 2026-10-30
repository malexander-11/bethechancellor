import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget } from '../data';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name });

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the note about a link (2026-09-30)', () => {
  it('goes when dismissed, leaving focus at the start of the screen rather than nowhere', () => {
    at(`/?${BASE}&L=itbr.1`);
    const dismiss = screen.getByRole('button', { name: 'Dismiss the note about this link' });
    dismiss.focus();
    fireEvent.click(dismiss);
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
    expect(document.getElementById('main')).toHaveFocus();
  });
});

describe('the road runs one way', () => {
  it('sends a game that jumps ahead back to the furthest open stage', () => {
    // At fine-tuning (st.0): the review is not open, and Budget day two stops away.
    const early = at(`/review?${BASE}&g=st.0_rd.2`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    early.unmount();
    at(`/budget-day?${BASE}&g=st.0_rd.2`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });

  it('opens Budget day from the review, and a finished link opens the same screen', () => {
    const fromReview = at(`/budget-day?${BASE}&g=st.1_rd.2`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    fromReview.unmount();
    at(`/budget-day?${BASE}&g=st.2_rd.2`);
    expect(h1('What your Budget means')).toBeInTheDocument();
  });

  it('sends a link with no game to the Budget, measures and all, and starts the game with them', async () => {
    // The desk and its sandbox have gone (Phase 26): every step needs a game, and a link's
    // measures wait on the Chancellor's Budget for the game its button starts (ADR-0045).
    for (const path of ['/budget/spending', '/finetune/tax', '/budget-day', '/review', '/pm']) {
      const view = at(`${path}?${BASE}&L=itbr.1`);
      expect(h1(budget.title), path).toBeInTheDocument();
      view.unmount();
    }
    at(`/budget-day?${BASE}&L=itbr.1`);
    expect(new URLSearchParams(window.location.search).get('L')).toBe('itbr.1');
    // One line says the measures are not lost; starting the game keeps them.
    const note = screen.getByRole('note', { name: 'About this link' });
    expect(note).toHaveTextContent('This link’s measures will be in your Budget when you start.');
    fireEvent.click(screen.getByRole('button', { name: 'Change the Chancellor’s Budget' }));
    await waitFor(() => {
      const search = new URLSearchParams(window.location.search);
      expect(search.get('L')).toBe('itbr.1');
      expect(search.get('M')).toBeNull();
      expect(search.get('g')).toBe('st.0_rd.2');
    });
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
  });

  it('always lets you go back: a game at the review can reopen fine-tuning and the Budget', () => {
    const guided = at(`/finetune/tax?${BASE}&g=st.1_rd.2`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    guided.unmount();
    // The desk's old address opens the screen of fine-tuning that took its levers.
    const desk = at(`/budget/taxes?${BASE}&g=st.1_rd.2`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    desk.unmount();
    at(`/?${BASE}&g=st.1_rd.2`);
    expect(h1(budget.title)).toBeInTheDocument();
  });

  it('opens the retired addresses and the old roads’ links on the stage that took their place', () => {
    // The forecast, the compromises and the add-ons became the review (Phase 24).
    for (const path of ['/forecast', '/compromise', '/compromise/2', '/rabbit']) {
      const view = at(`${path}?${BASE}&g=st.1_rd.2`);
      expect(h1('Deliver your Budget'), path).toBeInTheDocument();
      view.unmount();
    }
    // A six-stage link at its review (st.4) lands on the review; one at its flagships (st.2)
    // cannot reach it and is sent to fine-tuning, its priorities dropped (ADR-0045).
    const six = at(`/review?${BASE}&g=st.4_pr.defence`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    six.unmount();
    const flagships = at(`/budget/deliver?${BASE}&g=st.2_pr.defence`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    flagships.unmount();
    // A link from before Phase 24, at its compromises (old st.4), lands on the review too; one
    // still at its package (old st.2) is sent to fine-tuning.
    const old = at(`/compromise/2?${BASE}&g=s.417_st.4_pl.adviser_hr.20_pr.defence_rv.1`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    old.unmount();
    at(`/rabbit?${BASE}&g=s.417_st.2_pl.adviser_hr.20_pr.defence`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });
});
