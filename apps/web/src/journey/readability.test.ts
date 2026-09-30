import { finetuneItems, plainText } from '@btc/engine';
import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODE_WORDS } from '../components/ModeLine';
import { briefingTemplates, fillIn } from './briefingWords';
import {
  finetune,
  guide,
  interventions,
  levers,
  ministers,
  options,
  pm,
  reception,
  verdicts,
} from '../data';

/** The longest sentence a newcomer meets on the road (Phase 23, ADR-0024): one idea, one breath. */
const SENTENCE_MAX = 20;
/** The Flesch-Kincaid grade every set aims at: about a reading age of twelve. */
const GRADE_MAX = 7;

/** A template's placeholders, as the page would fill them, so the figure counts as one word. */
const fill = (s: string) =>
  s
    .replace(/\{value\}|\{abs\}|\{gap\}/g, '£5bn')
    .replace(/\{name\}/g, 'The tax lock')
    .replace(/\{priority\}/g, 'defence');

/** Full stops that end no sentence: "No. 10", "e.g.", "i.e.". */
/** A private-use character that stands in for the space after such a full stop while splitting. */
const JOIN = '\uE000';
const NOT_AN_END = [/\bNo\. /g, /\be\.g\. /g, /\bi\.e\. /g];

/** The sentences of a text: a full stop, question or exclamation mark, then a new capital or figure. */
export function sentences(text: string): string[] {
  let t = fill(text);
  for (const re of NOT_AN_END) t = t.replace(re, (m) => m.replace('. ', `.${JOIN}`));
  return t
    .split(/(?<=[.!?])\s+(?=[“"'(£\dA-Z])/)
    .map((s) => s.split(JOIN).join(' ').trim())
    .filter(Boolean);
}

const words = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w£]+|[^\w%]+$/g, ''))
    .filter(Boolean);

/** Capitals said as a word, not letter by letter. */
const SAID_AS_WORDS = new Set(['NATO', 'PIP', 'SEND']);

/**
 * A syllable count by the usual heuristic: vowel groups, less a silent e; a figure is one. An
 * acronym is read letter by letter (Phase 25): "OBR" is three syllables, not one, so a set that
 * leans on them cannot hide behind a flattering grade.
 */
export function syllables(word: string): number {
  const caps = word.replace(/['’]s$/, '').replace(/[^A-Za-z]/g, '');
  if (/^[A-Z]{2,5}$/.test(caps) && !SAID_AS_WORDS.has(caps)) return caps.length;
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** The Flesch-Kincaid grade of a set of texts read as one passage. */
export function grade(texts: readonly string[]): number {
  let S = 0;
  let W = 0;
  let Y = 0;
  for (const t of texts) {
    for (const s of sentences(t)) {
      S += 1;
      const ws = words(s);
      W += ws.length;
      for (const w of ws) Y += syllables(w);
    }
  }
  if (S === 0 || W === 0) return 0;
  return 0.39 * (W / S) + 11.8 * (Y / W) - 15.59;
}

const short = (l: { text: string; short?: string | undefined }) => l.short ?? l.text;
const all = options.deliver;
const curated = finetuneItems(finetune);

/**
 * Every set of words a player meets with the folds closed, by where it is met. A lever's own
 * headline is left out: it waits under "More about this", in the Treasury's terms.
 */
const SETS: Record<string, readonly string[]> = {
  'the guide': guide.stages.flatMap((s) => [s.title, s.now]),
  'option titles': all.map((o) => o.title),
  'option advice': all.map((o) => o.advice.text),
  // Graded delivery (Phase 25): why a way only makes a start, and the Chief Secretary's line.
  'the delivery scales': [...all.map((o) => o.scale.why), options.settled.text],
  'the fine-tuning screens': [
    ...[finetune.tax, finetune.spending].flatMap((s) => [
      s.title,
      s.lead,
      // Basic mode's lead (Phase 27): the adviser's best ideas.
      s.shortlistLead,
      ...s.groups.map((g) => g.label),
      ...s.notes.map((n) => n.text),
    ]),
    // The questions each tax asks (ADR-0035), read before any is opened.
    ...finetune.tax.groups.flatMap((g) => g.decisions.map((d) => d.title)),
    ...curated.flatMap((i) => [...(i.name ? [i.name] : []), ...i.policies.map((p) => p.title)]),
    // A spending fold's subheads (Phase 26): the families of the levers it holds. A tax's family is
    // its section's own heading now, read above.
    ...new Set(
      curated
        .filter((i) => i.side === 'spending')
        .map((i) => levers.find((l) => l.code === i.code)?.group ?? ''),
    ),
  ],
  'the fine-tuning advice': curated.flatMap((i) => i.policies.map((p) => p.advice.text)),
  'the priorities': pm.priorities.flatMap((p) => [
    p.title,
    p.purpose,
    short(p.reaction),
    ...(p.reach ? [p.reach.text] : []),
  ]),
  // Phase 25: the lines that say why two options cannot both be on.
  'the conflicts': all.flatMap((o) => (o.conflicts ?? []).map((c) => c.text)),
  // Phase 25: the Prime Minister at sign-off, as the review reads a line out.
  'the sign-off': Object.values(pm.signOff).map((l) =>
    l.text.replace('{rules}', 'the debt rule').replace('{promises}', 'the tax lock'),
  ),
  'the promises': pm.promises.flatMap((p) => [
    p.title,
    ...p.strains.map((s) => s.text).filter((t): t is string => t !== undefined),
  ]),
  'the reception labels': reception.audiences.flatMap((a) => [a.title, a.question, ...a.labels]),
  'the reception bands': reception.audiences.flatMap((a) =>
    a.rules.flatMap((r) =>
      r.bands.flatMap((b) => [b.text, ...(b.variants ?? []).map((v) => v.text)]),
    ),
  ),
  'the verdicts': verdicts.kinds.flatMap((k) => [k.title, short(k.line)]),
  'the interventions': interventions.interventions.map((x) => short(x.line)),
  'the ministers': ministers.ministers.flatMap((m) =>
    [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(short),
  ),
  // Basic and advanced (Phase 27): the line on a trimmed screen and what it says once pressed.
  // The footer's switch and its note went with ADR-0032.
  'the modes': [
    `${MODE_WORDS.shortlist} ${MODE_WORDS.ideas.basic}.`,
    `${MODE_WORDS.ideas.advanced}.`,
    ...Object.values(MODE_WORDS.said).flatMap((s) => [s.basic, s.advanced]),
  ],
  // The briefing in three parts (Phase 28): every heading and line, filled as the page fills
  // them.
  'the briefing': briefingTemplates().map((t) =>
    plainText(
      fillIn(t, {
        estimate: '£6.8bn',
        year: '2029-30',
        since: '2010',
        average: '£29bn',
        gilts: '£246bn',
      }),
    ),
  ),
};

describe('readability: a reading age of about twelve, one idea a sentence', () => {
  it('reads every set a newcomer meets', () => {
    expect(Object.keys(SETS).length).toBe(17);
    for (const [name, texts] of Object.entries(SETS)) expect(texts.length, name).toBeGreaterThan(0);
  });

  it('keeps every sentence to twenty words', () => {
    for (const [name, texts] of Object.entries(SETS)) {
      for (const text of texts) {
        for (const s of sentences(text)) {
          expect(words(s).length, `${name}: "${s}"`).toBeLessThanOrEqual(SENTENCE_MAX);
        }
      }
    }
  });

  it('reads at a Flesch-Kincaid grade of seven or below, set by set', () => {
    // Measured on 2026-09-27 after Phase 24 (ADR-0025, which retired the targets, the forecast
    // outcomes, the compromise screens and the add-ons with their sets): the guide 3.2, option
    // titles 5.1, option advice 4.6, the fine-tuning screens 5.1 and their advisers' lines 4.9,
    // the priorities 3.5, the promises 6.7, the reception labels 4.9 and bands 5.3, the verdicts
    // 5.9, the interventions 4.4, the ministers 5.5. Proper nouns (National Insurance, the
    // manifesto, the Chancellor) hold the promises highest. Re-measured on 2026-09-28 after
    // Phase 25 (ADR-0026), with acronyms read letter by letter and four new sets: the guide 3.2,
    // option titles 5.4, option advice 4.8, the delivery scales 6.1, the fine-tuning screens 5.2
    // and their advisers' lines 5.0, the priorities 4.1, the conflicts 3.3, since March 6.4, the
    // sign-off 1.6, the promises 5.6, the reception labels 4.9 and bands 5.1, the verdicts 4.9,
    // the interventions 4.2, the ministers 5.8. Re-measured after Phase 26 (ADR-0027), with every
    // lever a policy and the folds' subheads read: the fine-tuning screens 5.7 and their advisers'
    // lines 4.8, the guide 3.4 (step 4's line says "Choose policies"), the rest unchanged. Then
    // basic and advanced (Phase 27): the fine-tuning screens, with basic mode's leads, stay at 5.7;
    // the modes read at 3.4. Then the briefing in three parts (Phase 28), its folds included,
    // reads at 5.1, and at 5.1 again in the player's own words. Then plain copy (ADR-0031), the
    // debt rule its one fold: 4.6; the modes, without the briefing's switch, 5.2; the decisions
    // since March, on no screen now, are no longer read. Then the footer's switch went (ADR-0032):
    // the modes 3.8. Then the debt rule in the running text and the softer buffer line
    // (2026-09-30): the briefing 4.7; said to be the second rule, 4.8. Then tax by tax (ADR-0035),
    // with the decisions' titles read and the tax families no longer read on their own: the
    // fine-tuning screens 5.3 and their advisers' lines 4.8. Set GRADES to a file path to write
    // them out.
    for (const [name, texts] of Object.entries(SETS)) {
      const g = grade(texts);
      if (process.env.GRADES) appendFileSync(process.env.GRADES, `${name}: ${g.toFixed(1)}\n`);
      expect(g, `${name} reads at grade ${g.toFixed(1)}`).toBeLessThanOrEqual(GRADE_MAX);
    }
  });

  it('measures the way the record says it does', () => {
    expect(syllables('tax')).toBe(1);
    expect(syllables('Budget')).toBe(2);
    expect(syllables('manifesto')).toBe(4);
    // Letter by letter (Phase 25), except the capitals said as words.
    expect(syllables('OBR')).toBe(3);
    expect(syllables('HMRC’s')).toBe(4);
    expect(syllables('NATO')).toBe(2);
    expect(syllables('£5bn')).toBe(1);
    expect(sentences('No. 10 will notice. Nothing else is heard.')).toHaveLength(2);
    expect(sentences('Headroom of {value}: less than March left.')).toHaveLength(1);
    // Short words in short sentences read low; long words in long sentences read high.
    expect(grade(['The cat sat on the mat.'])).toBeLessThan(2);
    expect(
      grade([
        'Notwithstanding the aforementioned considerations, the administration contemplated substantial reconfiguration of departmental expenditure allocations.',
      ]),
    ).toBeGreaterThan(GRADE_MAX);
  });
});
