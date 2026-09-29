import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The workings: whether the sources, provenance drawers and breakdown tables are on show.
 *
 * Every number in the game is sourced and every derivation can be shown, but a newcomer does not
 * want to read the citations before they know what they are being asked to do. So they sat behind
 * a "Show workings" switch in the footer, off by default and remembered in the browser, until the
 * footer became one row of links and the switch was withdrawn for now (ADR-0032). The game's
 * screens show no workings, and the two reference pages, which are the workings, show them always.
 *
 * The preference moved to a new key when the switch went, so one set while it was on offer cannot
 * keep the workings on with no way to turn them off. Nothing on the page sets it now; the page
 * tests do, so the code the switch will bring back stays tested.
 */

const STORAGE_KEY = 'btc.workings.v2';

/** The reference pages: the workings are the point of the page, so they are always on show. */
const ALWAYS_ON = ['/methodology', '/about'];

interface WorkingsValue {
  workings: boolean;
  setWorkings: (on: boolean) => void;
  /** True on a reference page, which forces the workings open. */
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

/** The preference and the way to set it, for the switch when it comes back (ADR-0032). */
export function useWorkingsSwitch(): WorkingsValue {
  const ctx = useContext(WorkingsContext);
  return ctx ?? { workings: true, setWorkings: () => undefined, forced: false };
}

/** Renders its children only while the workings are on show. */
export function WorkingsOnly({ children }: { children: ReactNode }) {
  return useWorkings() ? <>{children}</> : null;
}
