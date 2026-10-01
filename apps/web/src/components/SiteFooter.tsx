import { NavLink } from 'react-router-dom';
import { BOARD_TEXT } from '../board/words';

/**
 * The foot of every screen: two quiet links, to the page about the game, how its numbers work, its
 * sources and its licence (ADR-0033), and to the leaderboard of other players' Budgets (ADR-0044).
 * Neither competes with the one button each screen is built around.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="About the game">
        <NavLink to="/about">About the game &amp; sources</NavLink>
        <NavLink to="/leaderboard" end>
          {BOARD_TEXT.footer}
        </NavLink>
      </nav>
    </footer>
  );
}
