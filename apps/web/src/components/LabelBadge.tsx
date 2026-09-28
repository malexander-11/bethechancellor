import type { Badge } from '@btc/engine';
import type { MouseEvent } from 'react';

/**
 * The five badges and what each means, in plain words (Phase 23); the footer lists them on every
 * screen. The ids and the classes are the honesty contract's (ADR-0002, ADR-0011) and do not move.
 */
export const BADGE_LABELS: Record<Badge, { text: string; title: string }> = {
  direct: {
    text: 'Official figure',
    title: 'A figure HMRC, HM Treasury or the OBR published, shown with its working.',
  },
  mechanical: {
    text: 'Worked out',
    title: 'Arithmetic on official figures, with no judgement in it.',
  },
  assumption: {
    text: 'Assumption',
    title: 'A number we chose, using published sensitivities where they exist.',
  },
  commentary: {
    text: 'Commentary',
    title: 'Words about an effect, with sources. Never a number of our own.',
  },
  simulated: {
    text: 'Game judgement',
    title: 'The game’s opinion, in a role’s voice. It quotes sources and never makes a number.',
  },
};

/** The id of the key at the foot of every page, which a badge opens. */
export const BADGE_KEY_ID = 'badge-key';

/**
 * Open the key at the foot of the page on this badge's line (Phase 25). A phone has no hover, so
 * the title alone was out of reach. Without the key on the page the link simply follows its hash.
 */
function openKey(event: MouseEvent<HTMLAnchorElement>, badge: Badge) {
  const key = document.getElementById(BADGE_KEY_ID);
  if (!(key instanceof HTMLDetailsElement)) return;
  event.preventDefault();
  key.open = true;
  const line = key.querySelector<HTMLElement>(`[data-badge="${badge}"]`) ?? key;
  line.scrollIntoView?.({ block: 'center' });
}

/**
 * A badge. It links to the key at the foot of the page, out of the tab order so a screen full of
 * cards gains no stops; the key's own summary is the keyboard's way in. `plain` is for the key
 * itself, where a link to where you already are would say nothing.
 */
export function LabelBadge({ badge, plain = false }: { badge: Badge; plain?: boolean }) {
  const { text, title } = BADGE_LABELS[badge];
  if (plain) {
    return (
      <span className={`badge badge--${badge}`} title={title}>
        {text}
      </span>
    );
  }
  return (
    <a
      className={`badge badge--${badge}`}
      href={`#${BADGE_KEY_ID}`}
      title={title}
      tabIndex={-1}
      onClick={(event) => openKey(event, badge)}
    >
      {text}
    </a>
  );
}
