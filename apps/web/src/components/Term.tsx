import { useId, useState } from 'react';
import { glossary } from '../data';

/**
 * A glossary word in running text, as a toggletip (Phase 25): tap or press it and the glossary's
 * short line opens beside it; tap again, or press Escape, and it closes. A phone has no hover, so a
 * definition behind a tooltip was out of reach; this one is a button any finger or keyboard can
 * open, and the opened line is announced to screen readers.
 */
export function Term({ id, children }: { id: string; children: string }) {
  const [open, setOpen] = useState(false);
  const tip = useId();
  const def = glossary.terms[id];
  if (!def) return <>{children}</>;
  return (
    <span className="term">
      <button
        type="button"
        className="term__word"
        aria-expanded={open}
        aria-controls={tip}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        {children}
      </button>
      <span id={tip} className="term__tip" aria-live="polite">
        {open ? ` (${def.short})` : ''}
      </span>
    </span>
  );
}
