import { computeOutcome, finetuneItems } from '@btc/engine';
import { describe, expect, it } from 'vitest';
import {
  advisers,
  briefings,
  finetune,
  glossary,
  guide,
  interventions,
  levers,
  ministers,
  options,
  pm,
  reception,
  rules,
  verdicts,
  vintage,
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
      ...pm.priorities.map((p) => ({ label: `${p.id} reaction`, line: p.reaction, max: 12 })),
      ...interventions.interventions.map((x) => ({ label: x.id, line: x.line, max: 14 })),
      ...verdicts.kinds.map((k) => ({ label: `verdict ${k.id}`, line: k.line, max: 18 })),
      ...options.deliver.map((o) => ({ label: `option ${o.id}`, line: o.line, max: 18 })),
    ];
    expect(road.length).toBeGreaterThan(50);
    for (const { label, line, max } of road) {
      const read = line.short ?? line.text;
      expect(words(read), `${label} reads "${read}"`).toBeLessThanOrEqual(max);
      // A short line is a shorter version of the long one, not a second speech.
      if (line.short) expect(words(line.short), label).toBeLessThan(words(line.text));
    }
  });

  it('gives every option one adviser line: twelve words, no figure, a size word the engine bears out', () => {
    // The line may say "big" or "small" only where the option's own figure for the target year
    // says so (Phase 23): big is £5bn or more, small £1bn or less, on the engine's arithmetic.
    const headroomOf = (leverValues: Record<string, number>) =>
      computeOutcome({ vintage, rules, levers, settings: { leverValues } }).verdicts.find(
        (v) => v.kind === 'currentBudget',
      )?.headroomGbpm ?? 0;
    const base = headroomOf({});
    const BIG = /\b(big|expensive|large|costly)\b/i;
    const SMALL = /\b(small|cheap|little|modest|tiny)\b/i;
    const FIGURE = /£\d|\d+%|\d+bn|\d{3},\d{3}/;
    const adviserIds = new Set(advisers.advisers.map((a) => a.id));
    // Since Phase 24 every option is a way to deliver a priority (ADR-0025).
    const all = options.deliver;
    expect(all.length).toBeGreaterThan(25);
    for (const o of all) {
      const text = o.advice.text;
      expect(words(text), `${o.id}: "${text}"`).toBeLessThanOrEqual(12);
      expect(text, o.id).not.toMatch(FIGURE);
      expect(adviserIds.has(o.advice.adviser), `${o.id} names ${o.advice.adviser}`).toBe(true);
      expect(o.advice.sources.length, o.id).toBeGreaterThan(0);
      const size = Math.abs(headroomOf(o.values) - base);
      const bn = (size / 1000).toFixed(1);
      if (BIG.test(text)) expect(size, `${o.id} says big at £${bn}bn`).toBeGreaterThanOrEqual(5000);
      if (SMALL.test(text))
        expect(size, `${o.id} says small at £${bn}bn`).toBeLessThanOrEqual(1000);
    }
    // Every title says what the option does, in at most twelve words.
    for (const o of all) expect(words(o.title), o.title).toBeLessThanOrEqual(12);
  });

  it('gives every curated lever a plain title and one adviser line that the engine bears out', () => {
    // The fine-tuning screens (Phase 24): the same rule as the options' lines, judged at the move
    // the line has in mind. Big is £5bn or more, small £1bn or less, on the engine's arithmetic.
    const headroomOf = (leverValues: Record<string, number>) =>
      computeOutcome({ vintage, rules, levers, settings: { leverValues } }).verdicts.find(
        (v) => v.kind === 'currentBudget',
      )?.headroomGbpm ?? 0;
    const base = headroomOf({});
    const BIG = /\b(big|expensive|large|costly)\b/i;
    const SMALL = /\b(small|cheap|little|modest|tiny)\b/i;
    const FIGURE = /£\d|\d+%|\d+bn|\d{3},\d{3}/;
    const items = finetuneItems(finetune);
    expect(items).toHaveLength(47);
    for (const item of items) {
      const text = item.advice.text;
      expect(words(text), `${item.code}: "${text}"`).toBeLessThanOrEqual(12);
      expect(text, item.code).not.toMatch(FIGURE);
      expect(words(item.title), item.title).toBeLessThanOrEqual(12);
      const size = Math.abs(headroomOf({ [item.code]: item.move }) - base);
      const bn = (size / 1000).toFixed(1);
      if (BIG.test(text))
        expect(size, `${item.code} says big at £${bn}bn`).toBeGreaterThanOrEqual(5000);
      if (SMALL.test(text))
        expect(size, `${item.code} says small at £${bn}bn`).toBeLessThanOrEqual(1000);
    }
    for (const side of [finetune.tax, finetune.spending]) {
      expect(words(side.title), side.title).toBeLessThanOrEqual(4);
      expect(words(side.lead), side.lead).toBeLessThanOrEqual(10);
    }
  });

  it('says what to do now in ten words, and a priority’s purpose in five', () => {
    // The desk is a side room and keeps its longer lines; every screen on the road is one breath.
    const road = guide.stages.filter((s) => s.step !== 'taxes' && s.step !== 'spending');
    // The cover and the six steps (Phase 24).
    expect(road.map((s) => s.step)).toEqual([
      'start',
      'outlook',
      'pm',
      'deliver',
      'finetune',
      'review',
      'budget-day',
    ]);
    for (const s of road) expect(words(s.now), `${s.step}: "${s.now}"`).toBeLessThanOrEqual(10);
    for (const p of pm.priorities) expect(words(p.purpose), p.id).toBeLessThanOrEqual(5);
  });

  it('never uses Treasury shorthand in the lines a newcomer reads', () => {
    // The acronyms, and the words of the trade a newcomer would have to look up (Phase 23).
    const ACRONYMS = /\b(RDEL|CDEL|PSNFL|PSNB|AME)\b/;
    const TRADE =
      /\b(accruals?|forestalling|outturns?|consequentials?|fiscal mandate|deleverag(?:ing|ed)|uprat(?:ing|ed)|incidence)\b/i;
    const all = options.deliver;
    const curated = finetuneItems(finetune);
    const read: string[] = [
      ...curated.map((i) => i.title),
      ...curated.map((i) => i.advice.text),
      ...[finetune.tax, finetune.spending].flatMap((s) => [
        s.title,
        s.lead,
        ...s.groups.map((g) => g.label),
      ]),
      ...guide.stages.map((s) => s.now),
      ...guide.stages.map((s) => s.title),
      ...all.map((o) => o.title),
      ...all.map((o) => o.advice.text),
      ...pm.priorities.flatMap((p) => [p.title, p.purpose, p.reaction.short ?? p.reaction.text]),
      ...verdicts.kinds.flatMap((k) => [k.title, k.line.short ?? k.line.text]),
      ...interventions.interventions.map((x) => x.line.short ?? x.line.text),
      ...reception.audiences.flatMap((a) => [a.title, a.question, ...a.labels]),
      ...briefings.briefings.map((b) => b.headline),
      ...ministers.ministers.flatMap((m) =>
        [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(
          (l) => l.short ?? l.text,
        ),
      ),
      ...reception.audiences.flatMap((a) => a.rules.flatMap((r) => r.bands.map((b) => b.text))),
    ];
    const defined = Object.values(glossary.terms).map((t) => t.short);
    expect(read.length).toBeGreaterThan(300);
    // A glossary entry may name the word it defines; nothing else on the road may.
    for (const text of defined) expect(text, text).not.toMatch(ACRONYMS);
    for (const text of read) {
      expect(text, text).not.toMatch(ACRONYMS);
      expect(text, text).not.toMatch(TRADE);
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
