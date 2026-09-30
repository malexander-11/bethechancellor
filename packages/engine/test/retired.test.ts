import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRawSourceConsistency } from '../src/index.js';
import { DATA_DIR, listJsonFiles, loadDataset, loadExtracts } from './fixtures.js';

/**
 * Words from mechanisms the game no longer has (Phase 25). Phase 24 retired the seeded forecast
 * draw and its re-scoring (ADR-0025), so nothing a player can read may say that "the harsher
 * forecasts" mark a figure down: the engine counts every figure in full. The decision records keep
 * their history; the data and the methodology describe the game as it is. Phase 12 retired the
 * letters from Parliament (ADR-0017): no group or line is named for them.
 */
const RETIRED = [
  /\bharsher forecasts?\b/i,
  /\bharder forecast outcomes?\b/i,
  /\bforecast outcomes? (?:in this game|revise)/i,
  /\bthis game[’']s harsher\b/i,
  /\bRecommendations from Parliament\b/i,
];

describe('no words from retired mechanisms', () => {
  it('in the data a player reads', () => {
    const files = [
      ...listJsonFiles(path.join(DATA_DIR, 'journey')),
      ...listJsonFiles(path.join(DATA_DIR, 'levers')),
      ...listJsonFiles(path.join(DATA_DIR, 'context')),
    ];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of RETIRED) {
        expect(pattern.test(text), `${path.relative(DATA_DIR, file)}: ${pattern}`).toBe(false);
      }
    }
  });

  it('in the methodology', () => {
    const text = readFileSync(path.join(DATA_DIR, '../docs/methodology.md'), 'utf8');
    for (const pattern of RETIRED) expect(pattern.test(text), String(pattern)).toBe(false);
  });
});

/**
 * Levers taken off the table (ADR-0017, ADR-0035): deprecated, their costings kept so the record
 * can be checked, and offered nowhere. Nothing still in play names one, so the web, which leaves
 * them out, never meets a dangling reference; an old link carrying one opens without it and says
 * so. Which levers are retired is the data's to say.
 */
describe('levers taken off the table', () => {
  const ds = loadDataset();
  const retired = ds.levers.filter((l) => l.deprecated);
  const extracted = loadExtracts();

  it('are kept for the record, each still reproducing from its sources', () => {
    for (const l of retired) {
      expect(l.status, l.code).toBe('reviewed');
      expect(checkRawSourceConsistency(l, extracted, ds.vintage), l.code).toEqual([]);
    }
    // The Shelved group holds nothing still on offer.
    for (const l of ds.levers.filter((x) => x.group === 'Shelved')) {
      expect(l.deprecated, l.code).toBe(true);
    }
  });

  /**
   * Every place a value names a retired lever: by its code (step 4, the promises, the options, the
   * incidence tags, the households, the desk) or by its id (another lever's interactions).
   */
  const names = new Map(
    retired.flatMap((l) => [[l.code, l.code] as const, [l.id, l.code] as const]),
  );
  function namingRetired(value: unknown, at: string): string[] {
    if (typeof value === 'string')
      return names.has(value) ? [`${at} names ${names.get(value)}`] : [];
    if (Array.isArray(value)) return value.flatMap((v, i) => namingRetired(v, `${at}[${i}]`));
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([key, v]) => [
      ...(names.has(key) ? [`${at}.${key} names ${names.get(key)}`] : []),
      ...namingRetired(v, `${at}.${key}`),
    ]);
  }

  it('are named by nothing still in play', () => {
    const found = [
      ...listJsonFiles(path.join(DATA_DIR, 'journey')),
      ...listJsonFiles(path.join(DATA_DIR, 'context')),
    ].flatMap((file) =>
      namingRetired(JSON.parse(readFileSync(file, 'utf8')), path.relative(DATA_DIR, file)),
    );
    for (const l of ds.levers.filter((x) => !x.deprecated)) {
      found.push(...namingRetired(l, `lever ${l.code}`));
    }
    expect(found).toEqual([]);
    // A promise that still watched one, or a lever that still named one, would be found.
    const [gone] = retired;
    if (!gone) return;
    expect(namingRetired({ breaks: [{ code: gone.code }] }, 'pm')).toEqual([
      `pm.breaks[0].code names ${gone.code}`,
    ]);
    expect(namingRetired({ interactions: [{ withLever: gone.id }] }, 'lever')).toEqual([
      `lever.interactions[0].withLever names ${gone.code}`,
    ]);
  });
});
