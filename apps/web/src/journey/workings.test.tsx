import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const KEY = 'btc.workings.v2';

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** A game at step 4 on today's estimate, with a penny on the basic rate chosen. */
const TUNING = `/finetune/tax?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5&L=itbr.1`;

const sourceLinks = () => document.querySelectorAll('.source a').length;
const workingsOf = () => document.querySelector('main')?.getAttribute('data-workings');

describe('the workings, with the switch withdrawn for now (ADR-0032)', () => {
  // The shared setup turns the workings on for every other test; here the app is met as a
  // player meets it now: nothing on the page can turn them on.
  beforeEach(() => window.localStorage.removeItem(KEY));

  it('shows no switch, no workings and no badges on the game’s screens: plain numbers', () => {
    at(TUNING);
    expect(screen.queryByRole('switch')).toBeNull();
    expect(workingsOf()).toBe('off');
    expect(sourceLinks()).toBe(0);
    expect(screen.queryByRole('button', { name: /Detail and sources/ })).toBeNull();
    // No badge says what kind of number something is, on step 4 or anywhere (ADR-0034).
    expect(document.querySelector('.badge')).toBeNull();
    expect(screen.queryByText('Official figure')).toBeNull();
    expect(screen.queryByText(/Turn on Show workings/)).toBeNull();
  });

  it('ignores a preference left from when the switch was on offer', () => {
    // A player who turned the workings on before the switch went would have no way to turn them
    // off, so the old key no longer counts.
    window.localStorage.setItem('btc.workings.v1', 'on');
    at(TUNING);
    expect(workingsOf()).toBe('off');
    expect(sourceLinks()).toBe(0);
  });

  it('keeps Budget day’s story and leaves its tables for the switch’s return', () => {
    at(`/budget-day?${BASE}&g=st.5_pr.defence&M=rate.0.75_rpi.0.5&L=itbr.1`);
    // A finished game's link opens Budget day whole. The Red Book's table of decisions is part of
    // the story and stays; the rules in full and the charts wait.
    expect(screen.getByText('Table 4.1: your policy decisions')).toBeInTheDocument();
    expect(screen.queryByText('The rules in full')).toBeNull();
    expect(screen.queryByText('Five-year paths')).toBeNull();
    expect(screen.getByRole('button', { name: /Copy a link/ })).toBeInTheDocument();
  });

  it('puts everything back when the preference is on, for the switch’s return', () => {
    window.localStorage.setItem(KEY, 'on');
    at(TUNING);
    expect(workingsOf()).toBe('on');
    expect(sourceLinks()).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Detail and sources/ }).length).toBeGreaterThan(0);
  });

  it('is always on the pages that are the workings, which list every source', () => {
    at('/about');
    expect(workingsOf()).toBe('on');
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument();
    expect(document.querySelectorAll('main table tbody tr').length).toBeGreaterThan(10);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
