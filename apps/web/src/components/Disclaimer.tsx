import { Link } from 'react-router-dom';
import { useWorkings } from '../journey/workings';

/**
 * One line at the foot of every screen: what kind of numbers these are, and where the rest is
 * written down. The paragraphs it used to carry live on the About and Methodology pages.
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
    </footer>
  );
}
