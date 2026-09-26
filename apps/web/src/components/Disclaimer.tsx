import type { Badge } from '@btc/engine';
import { Link } from 'react-router-dom';
import { useWorkings } from '../journey/workings';
import { BADGE_LABELS, LabelBadge } from './LabelBadge';

const BADGES = Object.keys(BADGE_LABELS) as Badge[];

/**
 * The foot of every screen: what kind of numbers these are, what the badges on them mean, and
 * where the rest is written down. The paragraphs it used to carry live on the About and
 * Methodology pages.
 */
export function Disclaimer() {
  const workings = useWorkings();
  return (
    <footer className="footer-note">
      <p>
        {!workings ? (
          <>
            Every figure is sourced: turn on <strong>Show workings</strong>, at the top of the page,
            to see where.{' '}
          </>
        ) : null}
        Costings are official estimates; the sliders are assumptions; the reactions are judgements,
        and say so. Growth and market effects are not modelled.{' '}
        <Link to="/about">Licence and sources</Link>.
      </p>
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
