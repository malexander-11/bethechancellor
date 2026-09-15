import { z } from 'zod';
import {
  badgeSchema,
  fiscalYearSchema,
  isoDateSchema,
  sourceRefSchema,
} from './provenance.schema.js';

const yearValuesSchema = z.record(fiscalYearSchema, z.number());

/** Receipts heads in the vintage's receiptsByHeadPctGdp, plus nominal GDP itself. */
export const taxHeadSchema = z.enum([
  'incomeTax',
  'nics',
  'vat',
  'onshoreCorporationTax',
  'capitalTaxes',
  'businessRates',
  'fuelDuties',
  'alcoholAndTobaccoDuties',
  'otherTaxes',
  'nominalGdp',
]);

export const controlSchema = z
  .strictObject({
    kind: z.enum(['slider', 'stepper', 'toggle', 'select']),
    /** p = pence in the pound; pp = percentage points; pct = per cent change; GBP = pounds a year. */
    unit: z.enum(['p', 'pp', 'pct', 'GBP', 'pctRealPerYear', 'GBPbn', 'bool', 'option']),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
    formatLabel: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((control, ctx) => {
    if (control.min >= control.max) {
      ctx.addIssue({ code: 'custom', message: 'min must be below max', path: ['min'] });
    }
    if (control.default < control.min || control.default > control.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'default must lie within [min, max]',
        path: ['default'],
      });
    }
    if (
      control.kind === 'toggle' &&
      !(control.min === 0 && control.max === 1 && control.step === 1)
    ) {
      ctx.addIssue({ code: 'custom', message: 'toggles use min 0, max 1, step 1', path: ['kind'] });
    }
  });

/** Qualitative second-round effect: direction and words, never a number (ADR-0002). */
export const considerationSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum([
    'behavioural',
    'macro',
    'distributional',
    'administrative',
    'legal',
    'interaction',
    'market',
  ]),
  direction: z.enum(['raisesLess', 'raisesMore', 'costsMore', 'costsLess', 'ambiguous']),
  magnitudeWords: z.enum(['small', 'moderate', 'large', 'unknown']).optional(),
  appliesWhen: z
    .strictObject({ above: z.number().optional(), below: z.number().optional() })
    .optional(),
  alreadyInDirectCosting: z.boolean(),
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
});

/** How ready-reckoner figures are carried to the game's years (ADR-0004). */
export const upratingRuleSchema = z.discriminatedUnion('method', [
  z.strictObject({
    method: z.literal('growWithSeries'),
    head: taxHeadSchema,
    note: z.string(),
  }),
  z.strictObject({ method: z.literal('flatCash'), note: z.string() }),
  z.strictObject({ method: z.literal('none') }),
]);

/** A published HMRC ready-reckoner row as cited by a lever. Values are as published (£m). */
export const hmrcRowRefSchema = z.strictObject({
  rowId: z.string().min(1),
  label: z.string().min(1),
  /** HMRC's sign: a "yield" row is positive when receipts rise; a "cost" row is positive when they fall. */
  hmrcSign: z.enum(['yield', 'cost']),
  /** Which table the row feeds for asymmetric levers. */
  role: z.enum(['increase', 'decrease']).default('increase'),
  values: yearValuesSchema,
});

export const rawSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('hmrcReadyReckoner'),
    sourceId: z.string().min(1),
    years: z.array(fiscalYearSchema).length(3),
    rows: z.array(hmrcRowRefSchema).min(1),
    combine: z.enum(['sum']).optional(),
    note: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal('hmtScorecard'),
    sourceId: z.string().min(1),
    lines: z
      .array(
        z.strictObject({
          number: z.number().int().positive(),
          title: z.string().min(1),
          values: yearValuesSchema,
        }),
      )
      .min(1),
    signConvention: z.literal('positiveReducesBorrowing'),
    note: z.string().optional(),
  }),
]);

export const costingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('linearPerUnit'),
    /** Size of one control unit in the lever's own terms (1 for a penny or a point; 104 for £2 a week). */
    unitDelta: z.number().positive(),
    /** Effect of one unit increase, engine sign (receipts positive = more revenue), keyed by ready-reckoner year. */
    perUnit: yearValuesSchema,
    basis: z.enum(['accruals', 'cash', 'liability']),
    symmetric: z.boolean(),
    /** Effect of one unit DEcrease, engine sign, for asymmetric levers. */
    decreasePerUnit: yearValuesSchema.optional(),
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('lookupTable'),
    input: z.enum(['p', 'pp', 'pct', 'GBP']),
    points: z
      .array(
        z.strictObject({
          input: z.number(),
          /** Engine sign, keyed by ready-reckoner year. */
          effect: yearValuesSchema,
          from: z
            .strictObject({ rowIds: z.array(z.string().min(1)).min(1), multiplier: z.number() })
            .optional(),
        }),
      )
      .min(2),
    interpolation: z.literal('linear'),
    extrapolation: z.literal('forbid'),
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('schedule'),
    /** Engine sign by fiscal year; years before the implementation year are ignored at runtime. */
    effect: yearValuesSchema,
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('shareOfBaselineSeries'),
    series: z.string().min(1),
    mode: z.enum(['pctRealPerYear', 'pctCash', 'absoluteGbpm']),
    deflator: z.enum(['gdpDeflator', 'cpi', 'none']),
  }),
  z.strictObject({
    kind: z.literal('sensitivity'),
    sensitivityId: z.string().min(1),
  }),
]);

export const classificationSchema = z.strictObject({
  side: z.enum(['receipts', 'spending']),
  currentOrCapital: z.enum(['current', 'capital']),
  taxHead: taxHeadSchema.optional(),
  delType: z.enum(['RDEL', 'CDEL']).optional(),
  department: z.string().optional(),
  insideWelfareCap: z.boolean().optional(),
  psnflTreatment: z.enum(['standard', 'financialTransaction']).default('standard'),
  barnettConsequential: z.boolean().optional(),
});

export const leverSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    /** Short stable code used in permalinks. Never reused. */
    code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
    category: z.enum(['tax', 'spend', 'welfare', 'macro']),
    badge: badgeSchema,
    /** UI grouping within a category, e.g. "Income tax"; ordered by `order`. */
    group: z.string().min(1).optional(),
    order: z.number().int().optional(),
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    description: z.string().min(1),
    baselinePolicy: z.strictObject({
      text: z.string().min(1),
      value: z.number().optional(),
      unit: z.string().optional(),
      source: sourceRefSchema,
      alreadyIncludes: z.array(z.string()).optional(),
    }),
    control: controlSchema,
    earliestImplementation: fiscalYearSchema.optional(),
    appliesFrom: z.enum(['firstForecastYear', 'implementationYear']).optional(),
    classification: classificationSchema.optional(),
    costing: costingSchema,
    indexation: z
      .strictObject({
        baseline: z.enum(['CPI', 'RPI', 'frozen', 'earnings', 'tripleLock', 'none']),
        frozenUntil: fiscalYearSchema.optional(),
        note: z.string(),
      })
      .optional(),
    considerations: z.array(considerationSchema),
    interactions: z
      .array(
        z.strictObject({
          withLever: z.string().min(1),
          text: z.string().min(1),
          severity: z.enum(['info', 'warn']),
        }),
      )
      .optional(),
    deprecated: z.boolean().optional(),
    status: z.enum(['draft', 'reviewed']),
    reviewedOn: isoDateSchema.optional(),
  })
  .superRefine((lever, ctx) => {
    if (lever.category === 'macro') {
      if (lever.costing.kind !== 'sensitivity') {
        ctx.addIssue({
          code: 'custom',
          message: 'macro levers must use a sensitivity costing',
          path: ['costing', 'kind'],
        });
      }
      if (lever.badge !== 'assumption') {
        ctx.addIssue({
          code: 'custom',
          message: 'macro levers are assumptions and must carry the assumption badge',
          path: ['badge'],
        });
      }
    } else {
      if (lever.costing.kind === 'sensitivity') {
        ctx.addIssue({
          code: 'custom',
          message: 'only macro levers may use a sensitivity costing',
          path: ['costing', 'kind'],
        });
      }
      if (!lever.classification) {
        ctx.addIssue({
          code: 'custom',
          message: 'tax, spend and welfare levers need a classification',
          path: ['classification'],
        });
      }
      if (!lever.group) {
        ctx.addIssue({ code: 'custom', message: 'policy levers need a UI group', path: ['group'] });
      }
      if (
        lever.badge === 'direct' &&
        (lever.costing.kind === 'linearPerUnit' ||
          lever.costing.kind === 'lookupTable' ||
          lever.costing.kind === 'schedule') &&
        !lever.costing.rawSource
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'a direct costing must cite its published rows or lines in rawSource',
          path: ['costing', 'rawSource'],
        });
      }
    }
    if (lever.costing.kind === 'lookupTable') {
      const inputs = lever.costing.points.map((p) => p.input);
      const min = Math.min(...inputs);
      const max = Math.max(...inputs);
      if (lever.control.min < min || lever.control.max > max) {
        ctx.addIssue({
          code: 'custom',
          message: `control range [${lever.control.min}, ${lever.control.max}] must stay inside the published points [${min}, ${max}]`,
          path: ['control'],
        });
      }
      if (!inputs.includes(0)) {
        ctx.addIssue({
          code: 'custom',
          message: 'lookup tables need a point at 0',
          path: ['costing', 'points'],
        });
      }
      if (new Set(inputs).size !== inputs.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'lookup inputs must be distinct',
          path: ['costing', 'points'],
        });
      }
    }
    if (
      lever.costing.kind === 'linearPerUnit' &&
      !lever.costing.symmetric &&
      !lever.costing.decreasePerUnit &&
      lever.control.min < 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'an asymmetric lever that can decrease needs decreasePerUnit',
        path: ['costing', 'decreasePerUnit'],
      });
    }
    if (lever.status === 'reviewed' && !lever.reviewedOn) {
      ctx.addIssue({
        code: 'custom',
        message: 'reviewed levers need reviewedOn',
        path: ['reviewedOn'],
      });
    }
  });
