import { computeOutcome } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import { balance, budget, glossary, guide, levers, ministers, rules, vintage } from '../data';
import { ON_SCREEN } from '../test/onScreen';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('word budgets: one line visible, the rest a click away', () => {
  it('every policy lever has a headline inside its budget', () => {
    expect(levers.some((l) => l.category !== 'macro')).toBe(true);
    for (const lever of levers) {
      expect(lever.headline, `${lever.code} has no headline`).toBeTruthy();
      expect(lever.headline?.length ?? 0, `${lever.code} headline too long`).toBeLessThanOrEqual(
        90,
      );
      expect(words(lever.headline ?? ''), `${lever.code} headline too wordy`).toBeLessThanOrEqual(
        14,
      );
    }
  });

  it('gives every minister a line of at most eighteen words, with the rest one click away', () => {
    for (const m of ministers.ministers) {
      const lines = [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)];
      expect(m.asking.short, `${m.code} asks in ${words(m.asking.text)} words`).toBeTruthy();
      for (const line of lines) {
        const read = line.short ?? line.text;
        expect(words(read), `${m.code}: "${read}"`).toBeLessThanOrEqual(18);
        // A short line is a shorter version of the long one, not a second speech.
        if (line.short) expect(words(line.short)).toBeLessThan(words(line.text));
      }
    }
  });

  it('keeps the walk and the menus to a breath each, and the money words the engine’s (ADR-0046)', () => {
    // A theme's title is a heading and its lead one line; a card's heading says what the
    // Chancellor did in a few words; a menu's choice is a label and what one press does.
    for (const theme of budget.themes) {
      expect(words(theme.title), theme.title).toBeLessThanOrEqual(6);
      expect(words(theme.lead), theme.lead).toBeLessThanOrEqual(20);
      for (const card of theme.cards) {
        expect(words(card.title), card.title).toBeLessThanOrEqual(10);
        expect(words(card.explain), card.explain).toBeLessThanOrEqual(45);
      }
    }
    const headroomOf = (leverValues: Record<string, number>) =>
      computeOutcome({ vintage, rules, levers, settings: { leverValues } }).verdicts.find(
        (v) => v.kind === 'currentBudget',
      )?.headroomGbpm ?? 0;
    const base = headroomOf({});
    const BIG = /\b(big|expensive|large|costly)\b/i;
    const SMALL = /\b(small|cheap|little|modest|tiny)\b/i;
    for (const option of [...balance.budgets, ...balance.raise, ...balance.spend]) {
      expect(words(option.label), option.label).toBeLessThanOrEqual(10);
      expect(words(option.each), option.each).toBeLessThanOrEqual(6);
      // A size word in a label is borne out by the engine at one press.
      const moved = Math.abs(headroomOf({ [option.code]: option.step }) - base);
      if (BIG.test(option.label)) expect(moved, option.label).toBeGreaterThanOrEqual(5000);
      if (SMALL.test(option.label)) expect(moved, option.label).toBeLessThanOrEqual(1000);
    }
    // A lever's plain name, as the review and the shared picture say it.
    for (const lever of levers) {
      if (lever.name) expect(words(lever.name), lever.name).toBeLessThanOrEqual(12);
    }
  });

  it('says what to do now in ten words', () => {
    // Every screen on the road is one breath.
    const road = guide.stages;
    expect(road.length).toBeGreaterThan(0);
    for (const s of road) expect(words(s.now), `${s.step}: "${s.now}"`).toBeLessThanOrEqual(10);
  });

  it('keeps the balance page’s choices to plain words, not a citation or the trade’s own', () => {
    // Phase 25, on the menus since ADR-0046: a choice says what it does, not where its figure
    // comes from. No organisation a newcomer would have to look up, none of the words of the
    // trade, and never "the lock" alone, which a pensioner hears as the triple lock.
    const ORGS =
      /\b(HMRC|IFS|IPPR|CenTax|JRF|CSJ|NAO|Onward|Resolution Foundation|Tax Policy Associates)\b/;
    const INSIDE =
      /\b(static|rows?|penny row|Bank Rate|front-loaded|steady-state|settlement|the benches)\b/i;
    const LOCK = /\bthe lock\b/i;
    const lines = [...(ON_SCREEN['the menus'] ?? [])];
    expect(lines.length).toBeGreaterThan(0);
    for (const text of lines) {
      expect(text, text).not.toMatch(ORGS);
      expect(text, text).not.toMatch(INSIDE);
      expect(text, text).not.toMatch(LOCK);
    }
  });

  it('never uses Treasury shorthand in the lines a newcomer reads', () => {
    // The acronyms, and the words of the trade a newcomer would have to look up (Phase 23).
    const ACRONYMS = /\b(RDEL|CDEL|PSNFL|PSNB|AME)\b/;
    const TRADE =
      /\b(accruals?|forestalling|outturns?|consequentials?|fiscal mandate|deleverag(?:ing|ed)|uprat(?:ing|ed)|incidence)\b/i;
    // Everything a newcomer reads with the folds closed, as the readability test reads it.
    const read = Object.values(ON_SCREEN).flat();
    const defined = Object.values(glossary.terms).map((t) => t.short);
    expect(read.length).toBeGreaterThan(0);
    // A glossary entry may name the word it defines; nothing else on the road may.
    for (const text of defined) expect(text, text).not.toMatch(ACRONYMS);
    for (const text of read) {
      expect(text, text).not.toMatch(ACRONYMS);
      expect(text, text).not.toMatch(TRADE);
    }
  });

  it('gives every lever a headline of one line, not a paragraph', () => {
    // The headline heads a lever's part of its card's "More about these" (ADR-0037); a lever with
    // one ships without its longer description (`@btc/pipeline/shipped`).
    for (const side of ['tax', 'spending'] as const) {
      const stepLevers = levers.filter(
        (l) =>
          !l.deprecated &&
          (side === 'tax'
            ? l.category === 'tax'
            : l.category === 'spend' || l.category === 'welfare'),
      );
      for (const l of stepLevers) expect(l.headline ?? l.description, l.code).toBeTruthy();
      const leverWords = stepLevers.reduce((acc, l) => acc + words(l.headline ?? l.description), 0);
      const perLever = leverWords / stepLevers.length;
      expect(perLever, `${side} averages ${perLever.toFixed(1)} words a lever`).toBeLessThanOrEqual(
        12,
      );
    }
  });
});
