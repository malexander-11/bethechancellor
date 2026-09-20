import type { ReactNode } from 'react';

/**
 * A table that may be wider than the screen scrolls sideways inside this. The wrapper is a named,
 * focusable region, so a keyboard can scroll it and a screen reader is told what it holds before
 * the first cell.
 */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
