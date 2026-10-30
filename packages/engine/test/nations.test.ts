import { describe, expect, it } from 'vitest';
import { finetuneItems, parseLever } from '../src/index.js';
import { loadDataset, readJson } from './fixtures.js';

const ds = loadDataset();
const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));

/**
 * Whose budgets these are (Phase 25, R16). Health, schools, councils, transport and justice are
 * England's, or England and Wales's; Scotland, Wales and Northern Ireland get a share through their
 * grants, which the game's prices leave out (ADR-0006). The game says so where the choice is made.
 */
describe('the nations, where the choice is made (Phase 25)', () => {
  it('says where Scotland pays its own benefits, in gov.uk’s words, and where it sets income tax', () => {
    const scottish: Record<string, string> = {
      rvpip: 'govuk-pip-scotland',
      csjmh: 'govuk-pip-scotland',
      dlakids: 'govuk-dla-children-scotland',
      wdis: 'govuk-pip-scotland',
      woth: 'govuk-carers-allowance-scotland',
    };
    for (const [code, source] of Object.entries(scottish)) {
      const note = byCode
        .get(code)
        ?.considerations.find((c) => c.kind === 'devolution' && /Scotland/.test(c.text));
      expect(note, code).toBeDefined();
      expect(
        note?.sources.map((s) => s.sourceId),
        code,
      ).toContain(source);
    }
    // The basic rate's line on step 4 says Scotland sets its own rates, on gov.uk's authority.
    // Both ways (Phase 26): a cut in the basic rate does not reach Scotland's either.
    const itbr = finetuneItems(ds.finetune).find((i) => i.code === 'itbr');
    expect(itbr?.policies).toHaveLength(2);
    for (const policy of itbr?.policies ?? []) {
      expect(policy.advice.text).toMatch(/Scotland sets its own rates on wages and pensions/);
      expect(policy.advice.sources.map((s) => s.sourceId)).toContain('govuk-scottish-income-tax');
    }
    // Plan 2 is England and Wales's, and the line on it says so.
    const plan2 = finetuneItems(ds.finetune).find((i) => i.code === 'rvplan2');
    expect(plan2?.policies[0]?.advice.text).toMatch(/England and Wales/);
  });

  it('keeps a lever’s source range around its plan, inside its own range', () => {
    const json = readJson('levers/tax/income-tax-basic-rate.json') as {
      control: { sourceRange?: unknown };
    };
    expect(() => parseLever(json)).not.toThrow();
    const outside = structuredClone(json);
    outside.control.sourceRange = { min: 1, max: 2, text: 'Does not hold the plan.' };
    expect(() => parseLever(outside)).toThrow(/sourceRange must hold the default/);
    const wide = structuredClone(json);
    wide.control.sourceRange = { min: -9, max: 2, text: 'Wider than the lever.' };
    expect(() => parseLever(wide)).toThrow(/sourceRange must hold the default/);
    // Every rate costed from HMRC's 1p row stops being HMRC's past 2p either way.
    for (const code of ['itbr', 'ithr', 'itar', 'vats', 'nicm', 'nica', 'nicer']) {
      const range = byCode.get(code)?.control.sourceRange;
      expect([range?.min, range?.max], code).toEqual([-2, 2]);
    }
  });
});
