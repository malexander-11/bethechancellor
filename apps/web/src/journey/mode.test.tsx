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

/** The way between the modes: the button on a screen basic mode trims (ADR-0032). */
const everyIdea = () => screen.getByRole('button', { name: /^See every idea/ });
const bestIdeas = () => screen.getByRole('button', { name: 'Show only the best ideas' });
const modeOf = () => document.querySelector('main')?.getAttribute('data-mode');

describe('basic and advanced (Phase 27, ADR-0028)', () => {
  // The shared setup puts every other test in advanced mode; here the game is met as a newcomer
  // meets it.
  beforeEach(() => window.localStorage.removeItem(KEY));

  it('starts in basic mode, with every idea one button away and no switch in the footer', () => {
    at(TUNING);
    expect(modeOf()).toBe('basic');
    expect(everyIdea()).toBeEnabled();
    // The footer's switch is withdrawn for now (ADR-0032): the screen's button is the way.
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('remembers the choice, and comes back as it was left', () => {
    const view = at(TUNING);
    fireEvent.click(everyIdea());
    expect(modeOf()).toBe('advanced');
    expect(window.localStorage.getItem(KEY)).toBe('advanced');
    view.unmount();
    const again = at(TUNING);
    expect(modeOf()).toBe('advanced');
    expect(bestIdeas()).toBeInTheDocument();
    again.unmount();
    window.localStorage.setItem(KEY, 'basic');
    const third = at(TUNING);
    expect(modeOf()).toBe('basic');
    third.unmount();
    // Anything but advanced reads as basic.
    window.localStorage.setItem(KEY, 'expert');
    at(TUNING);
    expect(modeOf()).toBe('basic');
  });

  it('is a preference of its own: it leaves the workings as they were', () => {
    window.localStorage.setItem('btc.workings.v2', 'off');
    at(TUNING);
    fireEvent.click(everyIdea());
    expect(document.querySelector('main')?.getAttribute('data-workings')).toBe('off');
    expect(window.localStorage.getItem('btc.workings.v2')).toBe('off');
    fireEvent.click(bestIdeas());
    expect(window.localStorage.getItem(KEY)).toBe('basic');
  });

  it('is never in the link: a change of mode leaves the query string as it was', async () => {
    at(TUNING);
    // The budget writes its own address once it settles; a change of mode must not touch it after.
    const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
    await settle();
    const before = window.location.search;
    expect(before).toMatch(/L=itbr\.1/);
    fireEvent.click(everyIdea());
    fireEvent.click(bestIdeas());
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
