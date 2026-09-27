import { describe, expect, it } from 'vitest';
import { TARGETS } from '../pages/Outlook';
import {
  briefings,
  compromise,
  context,
  glossary,
  guide,
  interventions,
  levers,
  ministers,
  options,
  pm,
  rabbit,
  reception,
  verdicts,
} from '../data';

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

  it('gives every line met on the road a short form, and reads the short form in one breath', () => {
    // What shows on a screen is the short form; the full line is one tap away (ADR-0023).
    type Line = { text: string; short?: string | undefined };
    const road: { label: string; line: Line; max: number }[] = [
      ...pm.priorities.flatMap((p) => [
        { label: `${p.id} brief`, line: p.brief, max: 12 },
        { label: `${p.id} reaction`, line: p.reaction, max: 12 },
      ]),
      ...interventions.interventions.map((x) => ({ label: x.id, line: x.line, max: 14 })),
      { label: 'rabbit intro', line: rabbit.intro.line, max: 12 },
      { label: 'rabbit further', line: rabbit.further.line, max: 12 },
      { label: 'rabbit keep', line: rabbit.keep.line, max: 12 },
      ...Object.entries(compromise.routes).map(([id, r]) => ({
        label: `route ${id}`,
        line: r.line,
        max: 14,
      })),
      { label: 'no breach', line: compromise.routes.breach.noBreach, max: 14 },
      ...verdicts.kinds.map((k) => ({ label: `verdict ${k.id}`, line: k.line, max: 18 })),
      ...options.deliver.map((o) => ({ label: `option ${o.id}`, line: o.line, max: 18 })),
      ...options.addOns.map((o) => ({ label: `add-on ${o.id}`, line: o.line, max: 18 })),
    ];
    expect(road.length).toBeGreaterThan(60);
    for (const { label, line, max } of road) {
      const read = line.short ?? line.text;
      expect(words(read), `${label} reads "${read}"`).toBeLessThanOrEqual(max);
      // A short line is a shorter version of the long one, not a second speech.
      if (line.short) expect(words(line.short), label).toBeLessThan(words(line.text));
    }
  });

  it('says what to do now in ten words, a priority’s purpose in five, a target in five', () => {
    // The desk is a side room and keeps its longer lines; every screen on the road is one breath.
    const road = guide.stages.filter((s) => s.step !== 'taxes' && s.step !== 'spending');
    expect(road.length).toBeGreaterThanOrEqual(10);
    for (const s of road) expect(words(s.now), `${s.step}: "${s.now}"`).toBeLessThanOrEqual(10);
    for (const p of pm.priorities) expect(words(p.purpose), p.id).toBeLessThanOrEqual(5);
    expect(TARGETS.length).toBe(4);
    for (const t of TARGETS) expect(words(t.say), t.label).toBeLessThanOrEqual(5);
  });

  it('sums up each forecast card in at most eight words', () => {
    const cards = context.scenarios ?? [];
    expect(cards.length).toBe(4);
    for (const card of cards) {
      expect(card.short, `${card.kind} has no short form`).toBeTruthy();
      expect(words(card.short ?? ''), card.kind).toBeLessThanOrEqual(8);
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
      ...guide.stages.map((s) => s.now),
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
