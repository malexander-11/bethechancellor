import { z } from 'zod';
import {
  badgeSchema,
  fiscalYearSchema,
  isoDateSchema,
  sourceRefSchema,
} from './provenance.schema.js';

const yearValuesSchema = z.record(fiscalYearSchema, z.number());

export const controlSchema = z
  .strictObject({
    kind: z.enum(['slider', 'stepper', 'toggle', 'select']),
    unit: z.enum(['pp', 'GBP', 'pctRealPerYear', 'GBPbn', 'bool', 'option']),
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

export const upratingRuleSchema = z.discriminatedUnion('method', [
  z.strictObject({
    method: z.literal('growWithSeries'),
    series: z.string().min(1),
    shiftProfileToImplementationYear: z.boolean(),
    steadyStateFromYear: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    note: z.string(),
  }),
  z.strictObject({ method: z.literal('flatCash'), note: z.string() }),
  z.strictObject({ method: z.literal('none') }),
]);

export const costingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('linearPerUnit'),
    unitDelta: z.number().positive(),
    perUnit: yearValuesSchema,
    basis: z.enum(['accruals', 'cash', 'liability']),
    symmetric: z.boolean(),
    decreasePerUnit: yearValuesSchema.optional(),
    source: sourceRefSchema,
    rawSource: z
      .strictObject({ years: z.array(fiscalYearSchema), values: yearValuesSchema })
      .optional(),
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('lookupTable'),
    input: z.enum(['pp', 'GBP']),
    points: z.array(z.strictObject({ input: z.number(), effect: yearValuesSchema })).min(2),
    interpolation: z.enum(['linear', 'monotoneCubic']),
    extrapolation: z.enum(['clamp', 'forbid']),
    source: sourceRefSchema,
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('schedule'),
    steps: z.array(z.strictObject({ from: fiscalYearSchema, effect: yearValuesSchema })).min(1),
    source: sourceRefSchema,
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
  taxHead: z.string().optional(),
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
    }
    if (lever.status === 'reviewed' && !lever.reviewedOn) {
      ctx.addIssue({
        code: 'custom',
        message: 'reviewed levers need reviewedOn',
        path: ['reviewedOn'],
      });
    }
  });
