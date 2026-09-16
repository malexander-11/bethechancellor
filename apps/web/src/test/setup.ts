import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup never registers.
afterEach(cleanup);

// Beat progress and the ceremony preference persist, so without this the order tests run in
// starts to matter.
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // Nothing stored, nothing to clear.
  }
});
