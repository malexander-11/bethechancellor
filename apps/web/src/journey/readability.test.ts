import { describe, expect, it } from 'vitest';
import {
  compromise,
  draws,
  guide,
  interventions,
  ministers,
  options,
  pm,
  rabbit,
  reception,
  verdicts,
} from '../data';
import { LEAD_MISSED, LEADS, NEXT, QUESTIONS } from '../pages/compromise/copy';
import { TARGETS } from '../pages/Outlook';

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

/** A syllable count by the usual heuristic: vowel groups, less a silent e; a figure is one. */
export function syllables(word: string): number {
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
const all = [...options.deliver, ...options.afford, ...options.addOns];

/**
 * Every set of words a player meets with the folds closed, by where it is met. The desk's own
 * lines are left out: it is the side room, and its levers speak in the Treasury's terms.
 */
const SETS: Record<string, readonly string[]> = {
  'the guide': guide.stages
    .filter((s) => s.step !== 'taxes' && s.step !== 'spending')
    .flatMap((s) => [s.title, s.now]),
  'option titles': all.map((o) => o.title),
  'option advice': all.map((o) => o.advice.text),
  'the priorities': pm.priorities.flatMap((p) => [p.title, p.purpose, short(p.reaction)]),
  'the promises': pm.promises.flatMap((p) => [
    p.title,
    ...p.strains.map((s) => s.text).filter((t): t is string => t !== undefined),
  ]),
  'the targets': TARGETS.flatMap((t) => [t.label, t.say]),
  'the forecast outcomes': draws.outcomes.flatMap((o) => [
    o.title,
    o.story.headline,
    o.clue.headline,
  ]),
  'the compromise questions': [
    ...QUESTIONS.sums,
    ...QUESTIONS.room,
    ...LEADS.sums,
    ...LEADS.room,
    LEAD_MISSED,
    ...NEXT.sums,
    ...NEXT.room,
  ],
  'the compromise routes': [
    ...Object.values(compromise.routes).map((r) => short(r.line)),
    short(compromise.routes.breach.noBreach),
  ],
  'the reception labels': reception.audiences.flatMap((a) => [a.title, a.question, ...a.labels]),
  'the reception bands': reception.audiences.flatMap((a) =>
    a.rules.flatMap((r) => r.bands.map((b) => b.text)),
  ),
  'the verdicts': verdicts.kinds.flatMap((k) => [k.title, short(k.line)]),
  'the interventions': interventions.interventions.map((x) => short(x.line)),
  'the add-ons’ lines': [short(rabbit.further.line), short(rabbit.keep.line)],
  'the ministers': ministers.ministers.flatMap((m) =>
    [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(short),
  ),
};

describe('readability: a reading age of about twelve, one idea a sentence', () => {
  it('reads every set a newcomer meets', () => {
    expect(Object.keys(SETS).length).toBe(15);
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
    // Measured on 2026-09-27 (ADR-0024): the guide 1.8, option titles 4.8, option advice 4.7,
    // the priorities 3.5, the promises 6.7, the targets 0.5, the outcomes 4.7, the compromise
    // questions 1.0, the routes 4.1, the reception labels 4.9 and bands about 6, the verdicts 5.5,
    // the interventions 5.8, the add-ons 5.5, the ministers 5.5. Proper nouns (National Insurance,
    // the manifesto, the Chancellor) hold the promises and the bands highest.
    for (const [name, texts] of Object.entries(SETS)) {
      const g = grade(texts);
      expect(g, `${name} reads at grade ${g.toFixed(1)}`).toBeLessThanOrEqual(GRADE_MAX);
    }
  });

  it('measures the way the record says it does', () => {
    expect(syllables('tax')).toBe(1);
    expect(syllables('Budget')).toBe(2);
    expect(syllables('manifesto')).toBe(4);
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
