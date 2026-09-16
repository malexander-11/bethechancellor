import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useBudget } from '../state/budget';

/**
 * A link between steps of the journey. The budget lives in the query string, so every step link
 * carries the current permalink with it; nothing else in the app is allowed to lose it.
 */
export function StepLink({
  to,
  children,
  className,
  end,
  replace,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string | ((state: { isActive: boolean }) => string);
  end?: boolean;
  replace?: boolean;
  /** Something to record as the player leaves, such as how far the game has got. */
  onClick?: () => void;
}) {
  const { query } = useBudget();
  return (
    <NavLink
      to={{ pathname: to, search: query ? `?${query}` : '' }}
      className={className}
      end={end}
      replace={replace}
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
}
