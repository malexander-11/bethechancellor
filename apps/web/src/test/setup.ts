import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup never registers.
afterEach(cleanup);

// The workings are off by default in the app, so a newcomer sees plain numbers. The page tests
// were written against the sources, drawers and tables, so they run with the switch on; the off
// state has its own tests in journey/workings.test.tsx, which clear this key first.
beforeEach(() => {
  try {
    window.localStorage.setItem('btc.workings.v1', 'on');
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
