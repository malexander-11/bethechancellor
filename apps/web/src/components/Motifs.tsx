/**
 * The Westminster cues, drawn once as inline SVG so they take the page's colours in both themes
 * and cost no request: the green benches and a sheaf of Budget papers. The red Budget box that
 * stood on the cover went with the cover's extras (ADR-0032). Each is decoration beside words that
 * carry the meaning, so each is hidden from the accessibility tree unless a caller names it.
 */

/** Three rows of Commons benches, as a divider between one part of a screen and the next. */
export function Benches({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`motif motif--benches ${className}`.trim()}
      viewBox="0 0 400 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="400" height="5" rx="2.5" fill="var(--accent)" opacity="0.9" />
      <rect x="24" y="9" width="352" height="5" rx="2.5" fill="var(--accent)" opacity="0.6" />
      <rect x="48" y="18" width="304" height="5" rx="2.5" fill="var(--accent)" opacity="0.35" />
    </svg>
  );
}

/** A sheaf of Budget papers: the mark beside anything that opens the numbers. */
export function Papers({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`motif motif--papers ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 3h8l4 4v14H7z" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 12h6M10 15.5h6M10 9h2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 7v14h11" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}
