import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DataError,
  leverSchema,
  parseDwpBenefitExtract,
  parseHmrcExtract,
  parseContext,
  parseLever,
  parsePesaExtract,
  parseReception,
  parseReliefExtract,
  parseScorecardExtract,
  parseSr25Extract,
  parseVintage,
  seriesSchema,
  validateDataset,
} from '../src/index.js';
import { DATA_DIR, listJsonFiles, loadDataset, readJson } from './fixtures.js';

describe('every JSON file under data/ validates against its schema', () => {
  const ds = loadDataset();

  it('loads the full dataset and passes cross-file checks', () => {
    expect(validateDataset(ds)).toEqual([]);
    expect(ds.levers.length).toBeGreaterThanOrEqual(45);
    expect(ds.levers.every((l) => l.status === 'reviewed')).toBe(true);
  });

  it('parses the Budget day reception', () => {
    const file = path.join(DATA_DIR, 'journey/reception.json');
    expect(() => parseReception(JSON.parse(readFileSync(file, 'utf8')))).not.toThrow();
  });

  it('has no JSON file that is not covered by a parser', () => {
    const covered = new Set([
      'sources/sources.json',
      'vintages/obr-2026-03/vintage.json',
      'rules/charter-2026-02.json',
      'presets/presets.json',
      'reference/uk-households.json',
      'journey/advisers.json',
      'journey/briefings.json',
      'journey/reception.json',
      'journey/draws.json',
      'journey/calendar.json',
      'journey/pm.json',
      'journey/ministers.json',
      'journey/interventions.json',
      'journey/compromise.json',
      'journey/rabbit.json',
      'journey/households.json',
      'journey/speech.json',
      'journey/incidence.json',
      'journey/verdicts.json',
      'journey/guide.json',
      'journey/glossary.json',
    ]);
    for (const file of listJsonFiles(DATA_DIR)) {
      const rel = path.relative(DATA_DIR, file);
      if (rel.startsWith('levers/')) {
        expect(() => parseLever(JSON.parse(readFileSync(file, 'utf8')))).not.toThrow();
      } else if (rel.startsWith('raw/')) {
        continue;
      } else if (rel.startsWith('context/')) {
        expect(() => parseContext(JSON.parse(readFileSync(file, 'utf8')))).not.toThrow();
      } else if (rel.startsWith('derived/')) {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
          schemaVersion?: number;
          sourceId?: string;
        };
        expect(parsed.schemaVersion).toBe(1);
        if (rel.includes('hmrc-trr')) expect(() => parseHmrcExtract(parsed)).not.toThrow();
        if (rel.includes('table-4-1') || rel.includes('table-5-1'))
          expect(() => parseScorecardExtract(parsed)).not.toThrow();
        if (rel.includes('tax-reliefs')) expect(() => parseReliefExtract(parsed)).not.toThrow();
        if (rel.includes('sr25')) expect(() => parseSr25Extract(parsed)).not.toThrow();
        if (rel.includes('dwp-benefit')) expect(() => parseDwpBenefitExtract(parsed)).not.toThrow();
        if (rel.includes('pesa')) expect(() => parsePesaExtract(parsed)).not.toThrow();
      } else {
        expect(covered.has(rel), `${rel} has no parser in the test`).toBe(true);
      }
    }
  });

  it('rejects a series whose year keys do not match its periodicity', () => {
    const bad = seriesSchema.safeParse({
      unit: 'GBPm',
      periodicity: 'FY',
      values: { '2029': 1 },
      source: { sourceId: 'x' },
    });
    expect(bad.success).toBe(false);
  });

  it('rejects a macro lever with a direct costing and a tax lever without classification', () => {
    const lever = readJson('levers/macro/interest-rates.json') as Record<string, unknown>;
    const macroWithLinear = {
      ...lever,
      costing: {
        kind: 'linearPerUnit',
        unitDelta: 1,
        perUnit: {},
        basis: 'accruals',
        symmetric: true,
        source: { sourceId: 'x' },
        uprating: { method: 'none' },
        caveats: [],
      },
    };
    expect(leverSchema.safeParse(macroWithLinear).success).toBe(false);
    const taxWithoutClassification = { ...macroWithLinear, category: 'tax', badge: 'direct' };
    expect(leverSchema.safeParse(taxWithoutClassification).success).toBe(false);
  });

  it('rejects a vintage whose forecast years are not consecutive', () => {
    const vintage = structuredClone(readJson('vintages/obr-2026-03/vintage.json')) as {
      years: { forecast: string[] };
    };
    vintage.years.forecast = ['2026-27', '2027-28', '2029-30', '2030-31', '2031-32'];
    expect(() => parseVintage(vintage)).toThrow(DataError);
  });

  it('rejects a vintage that breaks the PSNI identity', () => {
    const vintage = structuredClone(readJson('vintages/obr-2026-03/vintage.json')) as {
      fiscal: { psni: { values: Record<string, number> } };
    };
    vintage.fiscal.psni.values['2029-30'] = 1;
    expect(() => parseVintage(vintage)).toThrow(/identity PSNI/);
  });
});
