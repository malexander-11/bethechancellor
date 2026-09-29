import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { useMode } from './mode';

const BASE = 'v=1&f=obr2603&r=ch2602&i=2027';
const KEY = 'btc.mode.v1';
/** A game at step 4 on today's estimate, with a penny on the basic rate chosen. */
const TUNING = `/finetune/tax?${BASE}&g=st.3_pr.defence&M=rate.0.75_rpi.0.5&L=itbr.1`;

function at(path: string) {
  window.history.replaceState(null, '', path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const theSwitch = () => screen.getByRole('switch', { name: 'Advanced mode' });
const workings = () => screen.getByRole('switch', { name: 'Show workings' });
const modeOf = () => document.querySelector('main')?.getAttribute('data-mode');

describe('basic and advanced (Phase 27, ADR-0028)', () => {
  // The shared setup puts every other test in advanced mode; here the game is met as a newcomer
  // meets it.
  beforeEach(() => window.localStorage.removeItem(KEY));

  it('starts in basic mode, and says what advanced mode adds', () => {
    at(TUNING);
    expect(theSwitch()).not.toBeChecked();
    expect(modeOf()).toBe('basic');
    expect(theSwitch()).toHaveAccessibleDescription(
      'Shows every policy and the full briefing, not only your advisers’ best ideas.',
    );
    // Never disabled: unlike the workings, no page forces a mode.
    expect(theSwitch()).toBeEnabled();
  });

  it('remembers the choice, and comes back as it was left', () => {
    const view = at(TUNING);
    fireEvent.click(theSwitch());
    expect(theSwitch()).toBeChecked();
    expect(modeOf()).toBe('advanced');
    expect(window.localStorage.getItem(KEY)).toBe('advanced');
    view.unmount();
    const again = at(TUNING);
    expect(theSwitch()).toBeChecked();
    expect(modeOf()).toBe('advanced');
    again.unmount();
    window.localStorage.setItem(KEY, 'basic');
    const third = at(TUNING);
    expect(theSwitch()).not.toBeChecked();
    third.unmount();
    // Anything but advanced reads as basic.
    window.localStorage.setItem(KEY, 'expert');
    at(TUNING);
    expect(modeOf()).toBe('basic');
  });

  it('is a switch of its own: it leaves the workings as they were, and they leave it', () => {
    window.localStorage.setItem('btc.workings.v1', 'off');
    at(TUNING);
    fireEvent.click(theSwitch());
    expect(workings()).not.toBeChecked();
    expect(document.querySelector('main')?.getAttribute('data-workings')).toBe('off');
    fireEvent.click(workings());
    expect(theSwitch()).toBeChecked();
    fireEvent.click(theSwitch());
    expect(workings()).toBeChecked();
    expect(window.localStorage.getItem('btc.workings.v1')).toBe('on');
    expect(window.localStorage.getItem(KEY)).toBe('basic');
  });

  it('is never in the link: a switch leaves the query string as it was', async () => {
    at(TUNING);
    // The budget writes its own address once it settles; a switch must not touch it after.
    const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
    await settle();
    const before = window.location.search;
    expect(before).toMatch(/L=itbr\.1/);
    fireEvent.click(theSwitch());
    fireEvent.click(screen.getByRole('button', { name: 'Show only the best ideas' }));
    await settle();
    expect(window.location.search).toBe(before);
    expect(window.location.search).not.toMatch(/mode|basic|advanced/);
  });

  it('answers advanced outside a provider, so a component rendered alone shows everything', () => {
    function Probe() {
      return <p>{useMode()}</p>;
    }
    render(<Probe />);
    expect(screen.getByText('advanced')).toBeInTheDocument();
  });
});
