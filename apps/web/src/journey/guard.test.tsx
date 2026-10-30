import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { budget } from '../data';

const BASE = 'v=1&f=obr2610&r=ch2602&i=2027';
const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name });
const first = budget.themes[0]?.title ?? '';

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
    // A link with figures of its own for the economy: they give way to the forecast, and it says so.
    at(`/?${BASE}&L=itbr.1&M=rate.0.25`);
    const dismiss = screen.getByRole('button', { name: 'Dismiss the note about this link' });
    dismiss.focus();
    fireEvent.click(dismiss);
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
    expect(document.getElementById('main')).toHaveFocus();
  });
});

describe('the road runs one way', () => {
  it('sends a game that jumps ahead back to the furthest open stage', () => {
    // On the walk (st.0): the balance, the review and Budget day are not open.
    for (const path of ['/balance', '/review', '/budget-day']) {
      const early = at(`${path}?${BASE}&g=st.0_rd.3`);
      expect(h1(first), path).toBeInTheDocument();
      early.unmount();
    }
    // At the balance (st.1): the review and Budget day wait for it.
    at(`/budget-day?${BASE}&g=st.1_rd.3`);
    expect(h1('Balance your Budget')).toBeInTheDocument();
  });

  it('opens Budget day from the review, and a finished link opens the same screen', () => {
    const fromReview = at(`/budget-day?${BASE}&g=st.2_rd.3`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    fromReview.unmount();
    at(`/budget-day?${BASE}&g=st.3_rd.3`);
    expect(h1('What your Budget means')).toBeInTheDocument();
  });

  it('starts a game from a link with none, at the walk, measures and all (ADR-0047)', async () => {
    // Every step needs a game (Phase 26); a link without one starts it at the walk's first page,
    // the link's measures in it, so the later steps wait.
    for (const path of [
      '/',
      '/measures/income',
      '/balance',
      '/budget-day',
      '/review',
      '/finetune/tax',
    ]) {
      const view = at(`${path}?${BASE}&L=itbr.1`);
      expect(h1(first), path).toBeInTheDocument();
      view.unmount();
    }
    at(`/budget-day?${BASE}&L=itbr.1`);
    await waitFor(() => {
      const search = new URLSearchParams(window.location.search);
      expect(search.get('L')).toBe('itbr.1');
      expect(search.get('g')).toBe('st.0_rd.3');
    });
    // Nothing to say about the link: its measures are in the game.
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
  });

  it('always lets you go back: a game at the review can reopen the walk and the balance', () => {
    const walk = at(`/measures/income?${BASE}&g=st.2_rd.3`);
    expect(h1(first)).toBeInTheDocument();
    walk.unmount();
    const balance = at(`/balance?${BASE}&g=st.2_rd.3`);
    expect(h1('Balance your Budget')).toBeInTheDocument();
    balance.unmount();
    // The site's own address is the walk's first page, the game kept as it was (ADR-0047).
    at(`/?${BASE}&g=st.2_rd.3`);
    expect(h1(first)).toBeInTheDocument();
  });

  it('opens the retired addresses and the old roads’ links on the stage that took their place', () => {
    // The forecast, the compromises and the add-ons became the review (Phase 24).
    for (const path of ['/forecast', '/compromise', '/compromise/2', '/rabbit']) {
      const view = at(`${path}?${BASE}&g=st.2_rd.3`);
      expect(h1('Deliver your Budget'), path).toBeInTheDocument();
      view.unmount();
    }
    // A link from the three-stage road (ADR-0045): at its review (st.1) it lands on the review;
    // at fine-tuning (st.0) on the walk.
    const three = at(`/review?${BASE}&g=st.1_rd.2`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    three.unmount();
    const tuning = at(`/finetune/spending?${BASE}&g=st.0_rd.2`);
    expect(h1(first)).toBeInTheDocument();
    tuning.unmount();
    // A six-stage link at its review (st.4) lands on the review; one at its flagships (st.2) on
    // the walk, its priorities dropped.
    const six = at(`/review?${BASE}&g=st.4_pr.defence`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    six.unmount();
    const flagships = at(`/budget/deliver?${BASE}&g=st.2_pr.defence`);
    expect(h1(first)).toBeInTheDocument();
    flagships.unmount();
    // A link from before Phase 24, at its compromises (old st.4), lands on the review too; one
    // still at its package (old st.2) is sent to the walk.
    const old = at(`/compromise/2?${BASE}&g=s.417_st.4_pl.adviser_hr.20_pr.defence_rv.1`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    old.unmount();
    at(`/rabbit?${BASE}&g=s.417_st.2_pl.adviser_hr.20_pr.defence`);
    expect(h1(first)).toBeInTheDocument();
  });
});
