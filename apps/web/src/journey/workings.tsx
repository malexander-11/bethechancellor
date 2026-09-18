import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The "Show workings" switch.
 *
 * Every number in the game is sourced and every derivation can be shown, but a newcomer does not
 * want to read the citations before they know what they are being asked to do. So the sources,
 * provenance drawers and breakdown tables sit behind one switch, off by default and remembered in
 * the browser. The honesty contract is unchanged: nothing is removed, everything is one click
 * away, and the badges that say what kind of number something is stay on show whatever the switch
 * says. The two reference pages are the workings, so the switch is always on there.
 */

const STORAGE_KEY = 'btc.workings.v1';

/** Paths where the workings are the point of the page and the switch does nothing. */
const ALWAYS_ON = ['/methodology', '/about'];

interface WorkingsValue {
  workings: boolean;
  setWorkings: (on: boolean) => void;
  /** True on a page that forces the workings open, so the switch is shown but cannot move. */
  forced: boolean;
}

const WorkingsContext = createContext<WorkingsValue | null>(null);

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Private browsing or blocked storage: the default is off.
    return false;
  }
}

export function WorkingsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [chosen, setChosen] = useState<boolean>(readPreference);
  const forced = ALWAYS_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const setWorkings = useCallback((on: boolean) => {
    setChosen(on);
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      // Not remembering the preference is not worth breaking the page over.
    }
  }, []);

  const value = useMemo(
    () => ({ workings: forced || chosen, setWorkings, forced }),
    [forced, chosen, setWorkings],
  );
  return <WorkingsContext.Provider value={value}>{children}</WorkingsContext.Provider>;
}

/**
 * Whether the sources and breakdowns are on show. Outside a provider the answer is yes, so a
 * component rendered on its own, as the unit tests do, shows everything it has.
 */
export function useWorkings(): boolean {
  return useContext(WorkingsContext)?.workings ?? true;
}

/** The switch itself: for the header and the appointment screen. */
export function useWorkingsSwitch(): WorkingsValue {
  const ctx = useContext(WorkingsContext);
  return ctx ?? { workings: true, setWorkings: () => undefined, forced: false };
}

/** Renders its children only while the workings are on show. */
export function WorkingsOnly({ children }: { children: ReactNode }) {
  return useWorkings() ? <>{children}</> : null;
}
