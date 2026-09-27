import { render, screen } from '@testing-library/react';
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
    const early = at(`/review?${BASE}&g=st.2`);
    expect(h1('Flagship policies')).toBeInTheDocument();
    early.unmount();
    // At fine-tuning (st.3): Budget day is still two stops away.
    at(`/budget-day?${BASE}&g=st.3_pr.defence`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
  });

  it('opens Budget day from the review, and a finished link opens the same screen', () => {
    const fromReview = at(`/budget-day?${BASE}&g=st.4_pr.defence`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull();
    fromReview.unmount();
    at(`/budget-day?${BASE}&g=st.5_pr.defence`);
    expect(h1('What your Budget means')).toBeInTheDocument();
  });

  it('keeps a sandbox link open to the desk and Budget day, and sends its story pages to the briefing', () => {
    const desk = at(`/budget/spending?${BASE}&L=itbr.1`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    desk.unmount();
    const day = at(`/budget-day?${BASE}&L=itbr.1`);
    expect(h1('What your Budget means')).toBeInTheDocument();
    day.unmount();
    at(`/pm?${BASE}`);
    expect(h1('Your briefing')).toBeInTheDocument();
  });

  it('always lets you go back: a game at the review can reopen fine-tuning, the desk and the PM', () => {
    const guided = at(`/finetune/tax?${BASE}&g=st.4_pr.defence`);
    expect(h1('Fine-tune tax')).toBeInTheDocument();
    guided.unmount();
    const desk = at(`/budget/taxes?${BASE}&g=st.4_pr.defence`);
    expect(screen.getByText('Build the package')).toBeInTheDocument();
    desk.unmount();
    at(`/pm?${BASE}&g=st.4_pr.defence`);
    expect(screen.getByText('What is this Budget for?')).toBeInTheDocument();
  });

  it('opens the retired addresses and a Phase 23 link on the stage that took their place', () => {
    // The forecast, the compromises and the add-ons became the review (Phase 24).
    for (const path of ['/forecast', '/compromise', '/compromise/2', '/rabbit']) {
      const view = at(`${path}?${BASE}&g=st.4_pr.defence`);
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
