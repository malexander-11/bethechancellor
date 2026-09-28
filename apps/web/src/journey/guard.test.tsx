import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const h1 = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name });

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('the road runs one way', () => {
  it('sends a game that jumps ahead back to the furthest open stage', () => {
    // Agreed with the PM (st.2), so the flagship policies are open and the review is not; with
    // nothing ranked, the flagship screen says so.
    const early = at(`/review?${BASE}&g=st.2&M=rate.0.75_rpi.0.5`);
    expect(h1('Flagship policies')).toBeInTheDocument();
    early.unmount();
    // At fine-tuning (st.3): Budget day is still two stops away.
    at(`/budget-day?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });

  it('opens Budget day from the review, and a finished link opens the same screen', () => {
    const fromReview = at(`/budget-day?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    fromReview.unmount();
    at(`/budget-day?${BASE}&g=st.5_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(h1('What your Budget means')).toBeInTheDocument();
  });

  it('sends a link with no game to the briefing, measures and all, and starts the game with them', async () => {
    // The desk and its sandbox have gone (Phase 26): every step but the briefing needs a game.
    for (const path of ['/budget/spending', '/finetune/tax', '/budget-day', '/review', '/pm']) {
      const view = at(`${path}?${BASE}&L=itbr.1`);
      expect(h1('Your briefing'), path).toBeInTheDocument();
      view.unmount();
    }
    at(`/budget-day?${BASE}&L=itbr.1`);
    expect(new URLSearchParams(window.location.search).get('L')).toBe('itbr.1');
    // One line says the measures are not lost; starting the game keeps them, on the estimate.
    const note = screen.getByRole('note', { name: 'About this link' });
    expect(note).toHaveTextContent('This link’s measures will be in your Budget when you start.');
    fireEvent.click(screen.getByRole('button', { name: 'Set your priorities' }));
    await waitFor(() => {
      const search = new URLSearchParams(window.location.search);
      expect(search.get('L')).toBe('itbr.1');
      expect(search.get('M')).toBe('rate.0.75_rpi.0.5');
      expect(search.get('g')).toMatch(/^st\.1/);
    });
    expect(screen.queryByRole('note', { name: 'About this link' })).toBeNull();
  });

  it('always lets you go back: a game at the review can reopen fine-tuning and the PM', () => {
    const guided = at(`/finetune/tax?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    guided.unmount();
    // The desk's old address opens the screen of step 4 that took its levers.
    const desk = at(`/budget/taxes?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    desk.unmount();
    at(`/pm?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('opens the retired addresses and a Phase 23 link on the stage that took their place', () => {
    // The forecast, the compromises and the add-ons became the review (Phase 24).
    for (const path of ['/forecast', '/compromise', '/compromise/2', '/rabbit']) {
      const view = at(`${path}?${BASE}&g=st.4_pr.defence&M=rate.0.75_rpi.0.5`);
      expect(h1('Deliver your Budget'), path).toBeInTheDocument();
      view.unmount();
    }
    // A link from before, at its compromises (old st.4), lands on the review; one still at its
    // package (old st.2) cannot reach it and is sent to the flagship policies.
    const old = at(`/compromise/2?${BASE}&g=s.417_st.4_pl.adviser_hr.20_pr.defence_rv.1`);
    expect(h1('Deliver your Budget')).toBeInTheDocument();
    old.unmount();
    at(`/rabbit?${BASE}&g=s.417_st.2_pl.adviser_hr.20_pr.defence`);
    expect(h1(/Defence on the NATO path/)).toBeInTheDocument();
  });
});
