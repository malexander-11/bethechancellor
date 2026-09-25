import { formatGbpBn, type LeverEffect } from '@btc/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LeverGroup } from '../data';

/**
 * The lever groups: a row of tabs, and the one open group below them.
 *
 * This is a real tablist rather than a set of disclosures. With fifty levers, an accordion makes
 * a screen-reader user pass seven collapsed headers to reach any content, and buries "three
 * changed" in a button label instead of in tab state. Activation is manual: arrows move focus and
 * nothing else, Enter or Space opens. Auto-activation is only kind when a panel is cheap, and
 * ours re-renders up to nine controls.
 */

export function folderId(name: string): string {
  return `folder-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

interface DeskProps {
  groups: LeverGroup[];
  /** The lever codes the player has moved, so a touched group can show its effect. */
  moved: Set<string>;
  effects: LeverEffect[];
  summaryYear: string;
  open: string;
  onOpen: (name: string) => void;
  /** What a tab counts: levers by default; the ways to afford count options, and say "chosen". */
  nouns?: { item: string; items: string; changed: string };
  children: (group: LeverGroup) => React.ReactNode;
}

const LEVER_NOUNS = { item: 'lever', items: 'levers', changed: 'changed' };

/** What this group has done to borrowing in the target year, for the tag on its tab. */
function groupEffect(group: LeverGroup, effects: LeverEffect[], year: string): number {
  let total = 0;
  for (const lever of group.levers) {
    const effect = effects.find((e) => e.code === lever.code);
    if (!effect) continue;
    total +=
      (effect.currentSpending[year] ?? 0) +
      (effect.capitalSpending[year] ?? 0) -
      (effect.receipts[year] ?? 0);
  }
  return total;
}

export function Desk({
  groups,
  moved,
  effects,
  summaryYear,
  open,
  onOpen,
  nouns = LEVER_NOUNS,
  children,
}: DeskProps) {
  const names = useMemo(() => groups.map((g) => g.name), [groups]);
  const current = names.includes(open) ? open : (names[0] ?? '');
  const [focused, setFocused] = useState(current);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocused(current);
  }, [current]);

  const move = useCallback(
    (delta: number) => {
      const at = names.indexOf(focused);
      const next = names[(at + delta + names.length) % names.length];
      if (!next) return;
      setFocused(next);
      const el = strip.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(folderId(next))}`);
      el?.focus();
      // Arrow-keying must never leave focus off the end of a row that has wrapped.
      el?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
    },
    [focused, names],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'Home') move(-names.indexOf(focused));
    else if (e.key === 'End') move(names.length - 1 - names.indexOf(focused));
    else return;
    e.preventDefault();
  };

  const openGroup = groups.find((g) => g.name === current);

  return (
    <div className="lever-groups">
      <div
        className="group-tabs"
        role="tablist"
        aria-label="Lever groups"
        ref={strip}
        onKeyDown={onKeyDown}
      >
        {groups.map((group) => {
          const changed = group.levers.filter((l) => moved.has(l.code)).length;
          const selected = group.name === current;
          const net = changed > 0 ? groupEffect(group, effects, summaryYear) : 0;
          return (
            <button
              key={group.name}
              type="button"
              role="tab"
              id={folderId(group.name)}
              aria-selected={selected}
              aria-controls={`${folderId(group.name)}-panel`}
              tabIndex={selected ? 0 : -1}
              className="group-tab"
              onClick={() => onOpen(group.name)}
              onFocus={() => setFocused(group.name)}
            >
              <span className="group-tab__name">{group.name}</span>
              {/* Visible text, so the changed count is already in the tab's accessible name. */}
              <span className="group-tab__count">
                {changed > 0
                  ? `${changed} ${nouns.changed}`
                  : `${group.levers.length} ${group.levers.length === 1 ? nouns.item : nouns.items}`}
              </span>
              {changed > 0 ? (
                <span className="tag--treasury">
                  <span className="sr-only">worth </span>
                  {formatGbpBn(net, 1, true)}
                  <span className="sr-only"> to borrowing in {summaryYear}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {openGroup ? (
        <div
          className="group-panel"
          role="tabpanel"
          id={`${folderId(openGroup.name)}-panel`}
          aria-labelledby={folderId(openGroup.name)}
        >
          {children(openGroup)}
        </div>
      ) : null}
    </div>
  );
}
