import { NavLink } from 'react-router-dom';

/**
 * The foot of every screen (ADR-0033): one quiet link, to the page about the game, how its numbers
 * work, its sources and its licence. The three links it carried before (ADR-0032) competed with
 * the one button each screen is built around; the About page now sets out what they led to, and
 * links on to the full methodology.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="About the game">
        <NavLink to="/about">About the game &amp; sources</NavLink>
      </nav>
    </footer>
  );
}
