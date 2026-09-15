import { describe, expect, it } from 'vitest';
import { briefings, levers } from '../data';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('word budgets: one line visible, the rest a click away', () => {
  it('every policy lever has a headline inside its budget', () => {
    const policy = levers.filter((l) => l.category !== 'macro');
    expect(policy.length).toBeGreaterThan(40);
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

  it('every briefing leads with one line and keeps its detail sourced', () => {
    for (const b of briefings.briefings) {
      expect(b.headline.length, `${b.id} headline too long`).toBeLessThanOrEqual(140);
      expect(words(b.headline), `${b.id} headline too wordy`).toBeLessThanOrEqual(22);
      expect(b.paragraphs.length).toBeGreaterThan(0);
      for (const p of b.paragraphs) expect(p.sources.length).toBeGreaterThan(0);
    }
  });

  it('a step reads as a briefing, not a report', () => {
    for (const step of ['taxes', 'spending'] as const) {
      const stepBriefings = briefings.briefings.filter((b) => b.step === step);
      const stepLevers = levers.filter(
        (l) =>
          !l.deprecated &&
          (step === 'taxes'
            ? l.category === 'tax'
            : l.category === 'spend' || l.category === 'welfare'),
      );
      // Advisers speak in headlines; their paragraphs sit behind a disclosure.
      const briefingWords = stepBriefings.reduce((acc, b) => acc + words(b.headline), 0);
      expect(briefingWords, `${step} briefings show ${briefingWords} words`).toBeLessThanOrEqual(
        160,
      );
      // Each control carries one line, not a paragraph.
      const leverWords = stepLevers.reduce((acc, l) => acc + words(l.headline ?? l.description), 0);
      const perLever = leverWords / stepLevers.length;
      expect(
        perLever,
        `${step} averages ${perLever.toFixed(1)} words a control`,
      ).toBeLessThanOrEqual(12);
      // Far less than the descriptions they replace, which are still in the drawer.
      const drawerWords = stepLevers.reduce((acc, l) => acc + words(l.description), 0);
      expect(leverWords).toBeLessThan(drawerWords / 2);
    }
  });
});
