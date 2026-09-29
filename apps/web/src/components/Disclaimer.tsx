import type { Badge } from '@btc/engine';
import { Link } from 'react-router-dom';
import { useModeSwitch } from '../journey/mode';
import { useWorkingsSwitch } from '../journey/workings';
import { BADGE_KEY_ID, BADGE_LABELS, LabelBadge } from './LabelBadge';
import { MODE_WORDS } from './ModeLine';

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
 * The switch between basic and advanced (Phase 27, ADR-0028): off, the advisers' best ideas; on,
 * every policy. The briefing is the same either way (ADR-0031). Remembered, never forced.
 */
function ModeSwitch() {
  const { mode, setMode } = useModeSwitch();
  return (
    <>
      <label className="workings-switch" title={MODE_WORDS.note}>
        <input
          type="checkbox"
          role="switch"
          checked={mode === 'advanced'}
          aria-describedby="mode-switch-note"
          onChange={(e) => setMode(e.target.checked ? 'advanced' : 'basic')}
        />
        <span>{MODE_WORDS.switch}</span>
      </label>
      <span id="mode-switch-note" className="sr-only">
        {MODE_WORDS.note}
      </span>
    </>
  );
}

/**
 * The foot of every screen: what kind of numbers these are, then the utilities in one row (the
 * workings switch, the sources and licence) and what the badges mean, one tap away. The utilities
 * live here rather than in the header, where a reader looks for them once they want them (Phase
 * 23). The way to every lever went with the desk (Phase 26): every lever is a policy on step 4.
 * Advanced mode joined the utilities in Phase 27: two switches, each doing one thing.
 */
export function Disclaimer() {
  const { workings } = useWorkingsSwitch();
  return (
    <footer className="footer-note">
      <p>
        The figures are official, or clearly marked as our own sums. The reactions are the game’s
        opinion.
      </p>
      <div className="footer-note__tools">
        <ModeSwitch />
        <WorkingsSwitch />
        {!workings ? (
          <span className="footer-note__hint">
            Turn on Show workings to see where every figure comes from.
          </span>
        ) : null}
        <Link to="/about">Sources and licence</Link>
      </div>
      <details className="more more--quiet" id={BADGE_KEY_ID}>
        <summary>What the badges mean</summary>
        <dl className="more__body badges-key">
          {BADGES.map((badge) => (
            <div key={badge} data-badge={badge}>
              <dt>
                <LabelBadge badge={badge} plain />
              </dt>
              <dd>{BADGE_LABELS[badge].title}</dd>
            </div>
          ))}
        </dl>
      </details>
    </footer>
  );
}
