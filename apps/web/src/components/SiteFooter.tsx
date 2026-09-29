import { Link, NavLink } from 'react-router-dom';

/**
 * The foot of every screen (ADR-0032): one flat row of links, to the two reference pages and to
 * the sources and licence, and nothing else. The switches for the workings and for advanced mode
 * are withdrawn for now; the badges' key went with them, since the Methodology page says what each
 * badge means; and the line on what kind of numbers these are is the About page's to say.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="About the game">
        <NavLink to="/methodology">Methodology</NavLink>
        <NavLink to="/about">About &amp; sources</NavLink>
        <Link to="/about#licences">Sources and licence</Link>
      </nav>
    </footer>
  );
}
