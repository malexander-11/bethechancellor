import { useCallback, useEffect, useState } from 'react';

/**
 * The theme switch. The page is light by default, whatever the reader's system says: an official
 * paper is read on paper. The dark theme, with the same roles, is one switch away and remembered
 * in the browser; index.html applies a remembered choice before the first paint, so a dark page
 * never flashes light.
 */
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'btc.theme.v1';

const THEME_COLOR: Record<Theme, string> = { light: '#f3eee2', dark: '#131c17' };

export function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    // Private browsing or blocked storage: the default is light.
    return 'light';
  }
}

/** Sets the theme on the document, where the tokens read it, and the browser's own chrome colour. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const choose = useCallback((dark: boolean) => {
    const next: Theme = dark ? 'dark' : 'light';
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not remembering the preference is not worth breaking the page over.
    }
  }, []);
  return (
    <label className="workings-switch theme-switch">
      <input
        type="checkbox"
        role="switch"
        checked={theme === 'dark'}
        onChange={(e) => choose(e.target.checked)}
      />
      <span>Dark mode</span>
    </label>
  );
}
