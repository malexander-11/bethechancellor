import {
  FINAL_STAGE,
  PICTURE_SIZE,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { useMemo, useState } from 'react';
import { gameData } from '../data';
import { useOutcomeOf } from '../journey/outcome';
import { networks } from '../share/networks';
import { SHARE_TEXT } from '../share/words';
import { permalinkQuery, useBudget } from '../state/budget';

/** A finished Budget's page and picture on this site, as the server serves them (ADR-0044). */
export function sharedAddresses(query: string): { page: string; picture: string } {
  return { page: `${window.location.origin}/shared?${query}`, picture: `/api/card?${query}` };
}

/**
 * Budget day's way to share the Budget (ADR-0044): its picture, as a link to it previews; the one
 * button that shares the link, by the device's own sheet where there is one and by copying it
 * where there is not; the link to copy and the picture to save; and the networks' own pages for
 * posting a link. The link opens the shared page, which invites whoever opens it to play.
 */
export function SharePanel() {
  const { state } = useBudget();
  const outcomeOf = useOutcomeOf();
  const [copied, setCopied] = useState(false);
  const { leverValues, game } = state;
  // The Budget as it ends, written as every link to it is: the picture and the page are its own.
  const shared = useMemo(() => {
    if (!game) return null;
    const query = permalinkQuery({
      leverValues,
      warnings: [],
      game: { ...game, reached: FINAL_STAGE },
    });
    const budget = readFinishedBudget(gameData, query);
    if (!budget) return null;
    return {
      ...sharedAddresses(budget.query),
      words: summaryWords(summariseBudget(gameData, budget, outcomeOf)),
    };
  }, [leverValues, game, outcomeOf]);
  if (!shared) return null;
  const { page, picture, words } = shared;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(page);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      window.prompt(SHARE_TEXT.copy, page);
    }
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: words.title, text: words.share, url: page });
        return;
      } catch (error) {
        // Closing the sheet is the player's own choice; anything else falls back to the link.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyLink();
  }

  return (
    <section className="share" aria-labelledby="share-heading">
      <h2 id="share-heading" className="section-label">
        {SHARE_TEXT.heading}
      </h2>
      <img
        className="share__picture"
        src={picture}
        alt={words.alt}
        width={PICTURE_SIZE.width}
        height={PICTURE_SIZE.height}
        loading="lazy"
      />
      <p className="actions">
        <button type="button" className="btn btn--primary" onClick={share}>
          {SHARE_TEXT.share}
        </button>
        <button type="button" className="btn" onClick={copyLink}>
          {SHARE_TEXT.copy}
        </button>
        <a className="btn" href={`${picture}&download=1`} download="my-budget.png">
          {SHARE_TEXT.download}
        </a>
        <span role="status" className="actions__hint">
          {copied ? SHARE_TEXT.copied : ''}
        </span>
      </p>
      <p id="share-networks" className="share__label">
        {SHARE_TEXT.networks}
      </p>
      <ul className="share__networks" aria-labelledby="share-networks">
        {networks({ url: page, title: words.title, text: words.share }).map((n) => {
          // A network's page opens beside the game; mail opens the reader's own program.
          const away = !n.href.startsWith('mailto:');
          return (
            <li key={n.name}>
              <a
                className="linklike"
                href={n.href}
                {...(away ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {n.name}
                {away ? <span className="sr-only"> {SHARE_TEXT.newTab}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
