import { useEffect } from 'react';

const SITE = 'Be the Chancellor';

/**
 * The browser tab, the history entry and the first thing a screen reader announces on a new
 * screen: what this screen is, then the site. One title for eleven screens told nobody anything.
 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${SITE}`;
  }, [title]);
}
