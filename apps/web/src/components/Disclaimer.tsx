import type { Badge } from '@btc/engine';
import { Link, useLocation } from 'react-router-dom';
import { StepLink } from '../journey/links';
import { useWorkingsSwitch } from '../journey/workings';
import { BADGE_LABELS, LabelBadge } from './LabelBadge';

const BADGES = Object.keys(BADGE_LABELS) as Badge[];

/** The switch that puts the workings on show. The sources are never gone, only one click away. */
function WorkingsSwitch() {
  const { workings, setWorkings, forced } = useWorkingsSwitch();
  const explanation = forced
    ? 'This page is the workings.'
    : 'Show where every number comes from: sources, derivations and breakdowns.';
  // The explanation sits outside the label, so it describes the switch without renaming it.
  return (
    <>
      <label className="workings-switch" title={explanation}>
        <input
          type="checkbox"
          role="switch"
          checked={workings}
          disabled={forced}
          aria-describedby="workings-switch-note"
          onChange={(e) => setWorkings(e.target.checked)}
        />
        <span>Show workings</span>
      </label>
      <span id="workings-switch-note" className="sr-only">
        {explanation}
      </span>
    </>
  );
}

/**
 * The foot of every screen: what kind of numbers these are, then the utilities in one row (the
 * workings switch, the way to every lever, the sources and licence) and what the badges mean, one
 * tap away. The utilities live here rather than in the header, where a reader looks for them
 * once they want them (Phase 23). On the desk itself the "Every lever" link is not offered: the
 * desk is every lever.
 */
export function Disclaimer() {
  const { workings } = useWorkingsSwitch();
  const { pathname } = useLocation();
  const onDesk = pathname.startsWith('/budget/');
  return (
    <footer className="footer-note">
      <p>
        The figures are official, or clearly marked as our own sums. The reactions are the game’s
        opinion.
      </p>
      <div className="footer-note__tools">
        <WorkingsSwitch />
        {!workings ? (
          <span className="footer-note__hint">
            Turn on Show workings to see where every figure comes from.
          </span>
        ) : null}
        {onDesk ? null : <StepLink to="/budget/taxes">Every lever</StepLink>}
        <Link to="/about">Sources and licence</Link>
      </div>
      <details className="more more--quiet">
        <summary>What the badges mean</summary>
        <dl className="more__body badges-key">
          {BADGES.map((badge) => (
            <div key={badge}>
              <dt>
                <LabelBadge badge={badge} />
              </dt>
              <dd>{BADGE_LABELS[badge].title}</dd>
            </div>
          ))}
        </dl>
      </details>
    </footer>
  );
}
