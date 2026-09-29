/**
 * The Westminster cues, drawn once as inline SVG so they take the page's colours and cost no
 * request: the red Budget box, the green benches and a sheaf of Budget papers. Each is decoration
 * beside words that carry the meaning, so each is hidden from the accessibility tree.
 */

/** A flash from the cameras on Budget day: a four-pointed star, centred on (x, y). */
function flash(x: number, y: number, r: number): string {
  return `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
}

/**
 * The red Budget box, held up for the cameras (ADR-0033): the cover's one picture, drawn afresh
 * after the simpler box went from the cover (ADR-0032). A flat despatch box in red leather with gilt
 * tooling, a low brass handle, a brass lock and brass corners, tilted as if lifted, on a disc of
 * Commons green with three flashes round it. No cypher, crown or other official mark, and no
 * words: the heading beside it says what it is for.
 */
export function BudgetBox({ className = '' }: { className?: string }) {
  const edge = { stroke: 'var(--box-edge)', strokeWidth: 1.5, strokeLinejoin: 'round' } as const;
  const gilt = { fill: 'none', stroke: 'var(--gilt)' } as const;
  return (
    <svg
      className={`motif motif--box ${className}`.trim()}
      viewBox="20 14 280 206"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="160" cy="120" r="98" fill="var(--accent-wash)" />
      <ellipse cx="164" cy="208" rx="92" ry="6" fill="var(--ink)" opacity="0.12" />
      <g transform="rotate(-5 160 140)">
        {/* the top edge and the right side: a flat case, not a suitcase */}
        <path d="M72 88H248L259 79H83Z" fill="var(--box-top)" {...edge} />
        <path d="M248 88L259 79V190L248 199Z" fill="var(--box-side)" {...edge} />
        <path d="M77 83.9H253V194.9" fill="none" stroke="var(--box-edge)" opacity="0.7" />
        {/* the lid, with its gilt tooling */}
        <rect x="72" y="88" width="176" height="111" fill="var(--box)" {...edge} />
        <path d="M73.5 90.5H246" stroke="var(--box-top)" strokeWidth="1.5" />
        <rect x="81" y="97" width="158" height="93" {...gilt} strokeWidth="1.5" />
        <rect x="86" y="102" width="148" height="83" {...gilt} strokeWidth="0.75" />
        <path d="M160 133L166.5 143.5L160 154L153.5 143.5Z" {...gilt} strokeWidth="0.9" />
        <circle cx="160" cy="143.5" r="1.6" fill="var(--gilt)" />
        {/* the handle, low and brass, with the light along its grip */}
        <path
          d="M140 83V69Q140 64 145 64H175Q180 64 180 69V83"
          {...edge}
          fill="none"
          strokeWidth="7"
        />
        <path d="M140 83V69Q140 64 145 64H175Q180 64 180 69V83" {...gilt} strokeWidth="4.5" />
        <path
          d="M146 65.2H168"
          stroke="var(--gilt-light)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* the lock */}
        <rect x="150" y="91" width="20" height="17" fill="var(--gilt)" {...edge} strokeWidth="1" />
        <circle cx="160" cy="97.5" r="2.2" fill="var(--box-edge)" />
        <path d="M158.8 98.5H161.2L162 104H158Z" fill="var(--box-edge)" />
        {/* the brass corners */}
        <path
          d="M72.5 187V198.5H84M236 198.5H247.5V187M72.5 100V88.5H84M236 88.5H247.5V100"
          {...gilt}
          strokeWidth="3"
        />
      </g>
      <path
        d={`${flash(58, 62, 12)}${flash(268, 44, 8)}${flash(284, 140, 5)}`}
        fill="var(--brass)"
      />
      <circle cx="44" cy="128" r="2.4" fill="var(--brass)" />
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
