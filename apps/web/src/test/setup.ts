import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup never registers.
afterEach(cleanup);

// Basic mode is the default (Phase 27), and a player can switch to advanced. The page tests were
// written against the whole game, every policy and every way, so they run as a player who has
// switched; basic mode has its own tests, which clear this key first.
beforeEach(() => {
  try {
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
