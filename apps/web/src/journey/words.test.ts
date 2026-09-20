import { describe, expect, it } from 'vitest';
import { briefings, compromise, glossary, guide, levers, ministers, reception } from '../data';

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

  it('keeps every compromise route to one paragraph of at most forty words', () => {
    const lines = [
      ...Object.values(compromise.routes).map((r) => r.line.text),
      compromise.routes.breach.noBreach.text,
    ];
    for (const text of lines) expect(words(text), text).toBeLessThanOrEqual(40);
  });

  it('never uses Treasury shorthand in the lines a newcomer reads', () => {
    const JARGON = /\b(RDEL|CDEL|PSNFL|PSNB|AME|accruals?|forestalling)\b/;
    const read: string[] = [
      ...guide.stages.flatMap((s) => [s.doing, s.why, s.now]),
      ...Object.values(glossary.terms).map((t) => t.short),
      ...briefings.briefings.map((b) => b.headline),
      ...ministers.ministers.flatMap((m) =>
        [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(
          (l) => l.short ?? l.text,
        ),
      ),
      ...Object.values(compromise.routes).map((r) => r.line.text),
      ...reception.audiences.flatMap((a) => a.rules.flatMap((r) => r.bands.map((b) => b.text))),
    ];
    expect(read.length).toBeGreaterThan(100);
    for (const text of read) expect(text, text).not.toMatch(JARGON);
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
