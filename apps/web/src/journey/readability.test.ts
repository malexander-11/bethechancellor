import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ON_SCREEN as SETS } from '../test/onScreen';

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

describe('readability: a reading age of about twelve, one idea a sentence', () => {
  it('reads every set a newcomer meets, none of them empty', () => {
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
    // Set GRADES to a file path to write each set's grade out.
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
