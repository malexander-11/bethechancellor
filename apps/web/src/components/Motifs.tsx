/**
 * The three Westminster cues, drawn once as inline SVG so they take the page's colours in both
 * themes and cost no request: the red Budget box, the green benches and a sheaf of Budget papers.
 * Each is decoration beside words that carry the meaning, so each is hidden from the accessibility
 * tree unless a caller names it.
 */

export function BudgetBox({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`motif motif--box ${className}`.trim()}
      viewBox="0 0 200 150"
      aria-hidden="true"
      focusable="false"
    >
      {/* the shadow it stands on */}
      <ellipse cx="100" cy="134" rx="78" ry="8" fill="var(--ink)" opacity="0.12" />
      {/* the box */}
      <rect x="28" y="58" width="144" height="70" rx="6" fill="var(--box)" />
      <rect x="28" y="58" width="144" height="70" rx="6" fill="url(#box-shade)" />
      {/* the lid */}
      <path
        d="M24 60 Q24 44 40 44 H160 Q176 44 176 60 V66 H24 Z"
        fill="var(--box)"
        stroke="var(--box-edge)"
        strokeWidth="1.5"
      />
      <rect x="24" y="64" width="152" height="4" fill="var(--box-edge)" opacity="0.7" />
      {/* the handle */}
      <path
        d="M78 44 Q78 26 100 26 Q122 26 122 44"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* the clasp and the brass corners */}
      <rect x="92" y="66" width="16" height="18" rx="3" fill="var(--brass)" />
      <rect x="96" y="78" width="8" height="4" rx="1" fill="var(--box-edge)" />
      <rect x="32" y="112" width="18" height="10" rx="2" fill="var(--brass)" />
      <rect x="150" y="112" width="18" height="10" rx="2" fill="var(--brass)" />
      <defs>
        <linearGradient id="box-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
