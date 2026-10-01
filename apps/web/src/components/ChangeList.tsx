import type { ChangeRow } from '@btc/engine';

/**
 * Moved levers read back, one a line: the plain name, where it now stands, and what it does in the
 * target year ("The basic rate of income tax · 21% · raises £8.6bn"). The review's tax and spending
 * parts, and a shared Budget's.
 */
export function ChangeList({ rows }: { rows: readonly ChangeRow[] }) {
  return (
    <ul className="review__list">
      {rows.map((r) => (
        <li key={r.code}>
          {r.name}
          {r.standing ? ` · ${r.standing}` : ''} ·{' '}
          <span className={`amount amount--${r.tone}`}>{r.words}</span>
        </li>
      ))}
    </ul>
  );
}
