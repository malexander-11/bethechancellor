import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useBudget } from '../state/budget';

/** A link between journey steps that carries the current budget's query string. */
export function StepLink({
  to,
  children,
  className,
  end,
  replace,
}: {
  to: string;
  children: ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  end?: boolean;
  replace?: boolean;
}) {
  const { query } = useBudget();
  return (
    <NavLink
      to={{ pathname: to, search: query ? `?${query}` : '' }}
      className={className}
      end={end}
      replace={replace}
    >
      {children}
    </NavLink>
  );
}
