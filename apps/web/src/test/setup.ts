import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup never registers.
afterEach(cleanup);

// The workings are off in the app, so a player sees plain numbers; no switch offers them for now
// (ADR-0032). The page tests were written against the sources, drawers and tables, so they run
// with the preference on, which keeps that code tested for the switch's return; the off state has
// its own tests in journey/workings.test.tsx, which clear this key first.
beforeEach(() => {
  try {
    window.localStorage.setItem('btc.workings.v2', 'on');
    // Likewise basic mode is the default (Phase 27): the page tests were written against the
    // whole game, every policy and every way, so they run in advanced mode; basic mode has its
    // own tests, which clear this key first.
    window.localStorage.setItem('btc.mode.v1', 'advanced');
  } catch {
    // Blocked storage: the tests that need the switch will say so themselves.
  }
});

// Beat progress and the preferences persist, so without this the order tests run in starts to
// matter.
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // Nothing stored, nothing to clear.
  }
});
