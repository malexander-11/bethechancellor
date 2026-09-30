import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from './journey';

/** The WCAG 2.0 and 2.1 rules at levels A and AA. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Everything the player presses or ticks: buttons, tabs, links drawn as buttons or as links, a
 * fold's summary, and the labels that are the hit boxes of a scale's levels, of a set's "As
 * planned" and of a row's tick.
 */
const TARGETS = [
  'button',
  '[role="tab"]',
  '.btn',
  '.linklike',
  'summary',
  '.lever__size',
  '.tune__choice-planned',
  '.tune__row-choice',
].join(', ');

/** A glossary word inside a sentence is an inline target, which WCAG 2.5.8 excepts. */
const INLINE = '.term__word';

interface Found {
  short: string[];
  small: string[];
  running: string[];
  reducedMotion: boolean;
}

/**
 * Runs in the page: what axe does not check. Targets at least 44px tall; no text under 14px (SVG
 * text judged at the size it is drawn, on a wide screen); no animation running, when the browser
 * asks for reduced motion. Only what can be seen counts.
 */
function audit({ targets, inline }: { targets: string; inline: string }): Found {
  const visible = (el: Element) => {
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return false;
    // Chromium keeps layout boxes for the contents of a closed <details>; nobody can see them.
    if (el.closest('details:not([open])') && !el.closest('summary')) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && !el.closest('.sr-only');
  };
  const name = (el: Element) => {
    const classes = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean);
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${[el.tagName.toLowerCase(), ...classes].join('.')} "${text}"`;
  };
  const found: Found = {
    short: [],
    small: [],
    running: [],
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  for (const el of document.querySelectorAll(targets)) {
    if (!visible(el) || el.matches(inline)) continue;
    const height = el.getBoundingClientRect().height;
    if (height < 43.5) found.short.push(`${name(el)} is ${Math.round(height)}px tall`);
  }

  const seen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.textContent?.trim() || !el || seen.has(el) || !visible(el)) continue;
    seen.add(el);
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (!(el instanceof SVGElement)) {
      if (size < 13.9) found.small.push(`${name(el)} is set at ${size}px`);
      continue;
    }
    // SVG text scales with its viewBox: judged at the size it is drawn, where a chart is drawn
    // wide enough to read.
    const svg = el.closest('svg');
    const width = svg?.viewBox.baseVal?.width;
    if (svg && width && window.innerWidth >= 640) {
      const drawn = size * (svg.getBoundingClientRect().width / width);
      if (drawn < 13.5) found.small.push(`${name(el)} is drawn at ${drawn.toFixed(1)}px`);
    }
  }

  found.running = document
    .getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const target = (a.effect as KeyframeEffect | null)?.target;
      return `${a.constructor.name}${target ? ` on ${name(target)}` : ''}`;
    });
  return found;
}

/**
 * The screen as it stands passes axe's WCAG 2.1 A and AA rules and the audits above; its page must
 * ask for reduced motion. Soft, so one run reports everything wrong with the screen.
 */
export async function expectAccessible(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const rules = violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect.soft(rules, 'axe violations').toEqual([]);
  const found = await page.evaluate(audit, { targets: TARGETS, inline: INLINE });
  expect.soft(found.short, 'targets under 44px tall').toEqual([]);
  expect.soft(found.small, 'text under 14px').toEqual([]);
  expect(found.reducedMotion, 'the browser asks for reduced motion').toBe(true);
  expect.soft(found.running, 'animations running with reduced motion').toEqual([]);
}
