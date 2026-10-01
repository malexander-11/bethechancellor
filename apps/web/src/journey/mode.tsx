import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Basic and advanced (Phase 27, ADR-0028).
 *
 * A first game is played in basic mode: step 3 shows the best one or two ways to deliver each
 * priority. Advanced mode is the whole game: every way. The briefing and step 4, which shows every
 * policy, are the same in both (ADR-0031, ADR-0041). The choice is the viewer's
 * own, remembered in the browser and never carried in a link, so a shared Budget opens in the
 * recipient's mode; every lever it moves is on show anyway, because nothing chosen ever hides. The
 * way between the modes is the button on each screen basic mode trims; the footer's switch for it
 * is withdrawn for now (ADR-0032).
 */

export type Mode = 'basic' | 'advanced';

const STORAGE_KEY = 'btc.mode.v1';

interface ModeValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeValue | null>(null);

function readPreference(): Mode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'advanced' ? 'advanced' : 'basic';
  } catch {
    // Private browsing or blocked storage: a newcomer's game, basic.
    return 'basic';
  }
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setChosen] = useState<Mode>(readPreference);

  const setMode = useCallback((next: Mode) => {
    setChosen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembering the preference is not worth breaking the page over.
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

/**
 * Which ideas are on show. Outside a provider the answer is advanced, so a component rendered on
 * its own, as the unit tests do, shows everything it has.
 */
export function useMode(): Mode {
  return useContext(ModeContext)?.mode ?? 'advanced';
}

/** The mode and the way to change it: for the line on a trimmed screen. */
export function useModeSwitch(): ModeValue {
  return useContext(ModeContext) ?? { mode: 'advanced', setMode: () => undefined };
}
