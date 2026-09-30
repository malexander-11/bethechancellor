import { choiceName, computeOutcome, finetuneItems, plainText } from '@btc/engine';
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
import { briefingTemplates } from './briefingWords';

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

  it('gives every step-4 policy a plain title and one adviser line the engine bears out at every size', () => {
    // The fine-tuning screens (Phase 24): the same rule as the options' lines, judged at every size
    // a policy offers (Phase 26). Big is £5bn or more even at the smallest size; small is £1bn or
    // less even at the largest, on the engine's arithmetic.
    const headroomOf = (leverValues: Record<string, number>) =>
      computeOutcome({ vintage, rules, levers, settings: { leverValues } }).verdicts.find(
        (v) => v.kind === 'currentBudget',
      )?.headroomGbpm ?? 0;
    const base = headroomOf({});
    const BIG = /\b(big|expensive|large|costly)\b/i;
    const SMALL = /\b(small|cheap|little|modest|tiny)\b/i;
    const FIGURE = /£\d|\d+%|\d+bn|\d{3},\d{3}/;
    const items = finetuneItems(finetune);
    expect(items).toHaveLength(99);
    for (const item of items) {
      if (item.name) expect(words(item.name), item.name).toBeLessThanOrEqual(12);
      for (const policy of item.policies) {
        const text = policy.advice.text;
        expect(words(text), `${policy.title}: "${text}"`).toBeLessThanOrEqual(12);
        expect(text, policy.title).not.toMatch(FIGURE);
        expect(words(policy.title), policy.title).toBeLessThanOrEqual(12);
        const sizes = policy.sizes.map((size) =>
          Math.abs(headroomOf({ [item.code]: size }) - base),
        );
        const least = Math.min(...sizes);
        const most = Math.max(...sizes);
        if (BIG.test(text)) {
          expect(
            least,
            `${policy.title} says big at £${(least / 1000).toFixed(1)}bn`,
          ).toBeGreaterThanOrEqual(5000);
        }
        if (SMALL.test(text)) {
          expect(
            most,
            `${policy.title} says small at £${(most / 1000).toFixed(1)}bn`,
          ).toBeLessThanOrEqual(1000);
        }
      }
    }
    for (const side of [finetune.tax, finetune.spending]) {
      expect(words(side.title), side.title).toBeLessThanOrEqual(4);
      // Room for one more short sentence (Phase 25): a top-up costs what a trim saves.
      expect(words(side.lead), side.lead).toBeLessThanOrEqual(14);
      // Basic mode's lead says whose best ideas these are, in the same room (Phase 27).
      expect(words(side.shortlistLead), side.shortlistLead).toBeLessThanOrEqual(14);
    }
    // Each tax asks its questions in at most six words (ADR-0035), and so does each section of the
    // spending screen (ADR-0037); a figure may name the thing decided, as a policy's title may
    // ("Change the 5% band").
    const decisions = [finetune.tax, finetune.spending].flatMap((side) =>
      side.groups.flatMap((g) => g.decisions),
    );
    expect(decisions).toHaveLength(35);
    for (const d of decisions) expect(words(d.title), d.title).toBeLessThanOrEqual(6);
    // Ticks that contradict each other are one choice under one name, as short (ADR-0036).
    const alternatives = decisions.flatMap((d) => d.alternatives ?? []);
    expect(alternatives).toHaveLength(4);
    for (const a of alternatives) expect(words(a.name), a.name).toBeLessThanOrEqual(7);
    // Inside its decision each choice goes by a short name, as short again (ADR-0037): "Food"
    // under "Remove an exemption".
    for (const item of finetuneItems(finetune)) {
      expect(words(choiceName(item)), choiceName(item)).toBeLessThanOrEqual(7);
    }
  });

  it('says what to do now in ten words, and a priority’s purpose in ten', () => {
    // Every screen on the road is one breath.
    const road = guide.stages;
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
    // The briefing's line is the player's own (Phase 28, revised 2026-09-29): what the headroom is
    // for, in one sentence of eighteen words. Every other screen keeps to ten.
    const limit = (step: string) => (step === 'outlook' ? 18 : 10);
    for (const s of road)
      expect(words(s.now), `${s.step}: "${s.now}"`).toBeLessThanOrEqual(limit(s.step));
    // Ten words, not five (Phase 25): "Fund the plan, reach 3%" named no plan and no 3% of what.
    for (const p of pm.priorities) expect(words(p.purpose), p.id).toBeLessThanOrEqual(10);
  });

  it('keeps an adviser’s line to a consequence, not a citation or the trade’s own words', () => {
    // Phase 25: a line carries one plain consequence; where a figure comes from is the workings'
    // job (the badges that shared it went with ADR-0034). No organisation a newcomer would have to look up, none of the words of
    // the trade, and never "the lock" alone, which a pensioner hears as the triple lock.
    const ORGS =
      /\b(HMRC|IFS|IPPR|CenTax|JRF|CSJ|NAO|Onward|Resolution Foundation|Tax Policy Associates)\b/;
    const INSIDE =
      /\b(static|rows?|penny row|Bank Rate|front-loaded|steady-state|settlement|the benches)\b/i;
    const LOCK = /\bthe lock\b/i;
    const lines: string[] = [
      ...finetuneItems(finetune).flatMap((i) => i.policies.map((p) => p.advice.text)),
      ...options.deliver.map((o) => o.advice.text),
      ...options.deliver.flatMap((o) => (o.conflicts ?? []).map((c) => c.text)),
    ];
    expect(lines.length).toBeGreaterThan(75);
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
    const all = options.deliver;
    const curated = finetuneItems(finetune);
    const read: string[] = [
      ...curated.flatMap((i) => [...(i.name ? [i.name] : []), ...i.policies.map((p) => p.title)]),
      ...curated.flatMap((i) => i.policies.map((p) => p.advice.text)),
      ...[finetune.tax, finetune.spending].flatMap((s) => [
        s.title,
        s.lead,
        s.shortlistLead,
        ...s.groups.map((g) => g.label),
      ]),
      ...[finetune.tax, finetune.spending].flatMap((side) =>
        side.groups.flatMap((g) =>
          g.decisions.flatMap((d) => [d.title, ...(d.alternatives ?? []).map((a) => a.name)]),
        ),
      ),
      ...curated.flatMap((i) => (i.label ? [i.label] : [])),
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
      // The briefing in three parts (Phase 28): the OBR's own words say "fiscal mandate"; ours do not.
      ...briefingTemplates().map(plainText),
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

  it('gives every lever a headline of one line, not a paragraph', () => {
    // The headline heads a policy's "More about this"; the description behind it is the drawer's.
    for (const side of ['tax', 'spending'] as const) {
      const stepLevers = levers.filter(
        (l) =>
          !l.deprecated &&
          (side === 'tax'
            ? l.category === 'tax'
            : l.category === 'spend' || l.category === 'welfare'),
      );
      const leverWords = stepLevers.reduce((acc, l) => acc + words(l.headline ?? l.description), 0);
      const perLever = leverWords / stepLevers.length;
      expect(perLever, `${side} averages ${perLever.toFixed(1)} words a lever`).toBeLessThanOrEqual(
        12,
      );
      // Far less than the descriptions they replace, which are still in the drawer.
      const drawerWords = stepLevers.reduce((acc, l) => acc + words(l.description), 0);
      expect(leverWords).toBeLessThan(drawerWords / 2);
    }
  });
});
