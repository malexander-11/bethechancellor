import { z } from 'zod';

export const FISCAL_YEAR_PATTERN = /^\d{4}-\d{2}$/;
export const CALENDAR_YEAR_PATTERN = /^\d{4}$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const fiscalYearSchema = z
  .string()
  .regex(FISCAL_YEAR_PATTERN, 'fiscal year must look like 2029-30');

export const isoDateSchema = z.string().regex(ISO_DATE_PATTERN, 'date must be YYYY-MM-DD');

/** A pointer from a number to the document it came from. */
export const sourceRefSchema = z.strictObject({
  sourceId: z.string().min(1),
  table: z.string().optional(),
  page: z.string().optional(),
  paragraph: z.string().optional(),
  cell: z.string().optional(),
  quote: z.string().optional(),
  note: z.string().optional(),
});

/** One recorded transformation of a sourced number. */
export const derivationStepSchema = z.strictObject({
  op: z.enum([
    'scale',
    'shiftYears',
    'extend',
    'sum',
    'difference',
    'ratio',
    'signFlip',
    'convertUnit',
    'interpolate',
    'manual',
  ]),
  formula: z.string().min(1),
  factor: z.number().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  source: sourceRefSchema.optional(),
  note: z.string().optional(),
});

export const unitSchema = z.enum(['GBPm', 'pctGDP', 'pct', 'index', 'count']);
export const periodicitySchema = z.enum(['FY', 'CY']);

/** A sourced time series. Money is £ million; years are fiscal (2029-30) or calendar (2029). */
export const seriesSchema = z
  .strictObject({
    unit: unitSchema,
    periodicity: periodicitySchema,
    values: z.record(z.string(), z.number()),
    source: sourceRefSchema,
    provisional: z.boolean().optional(),
    derivation: z.array(derivationStepSchema).optional(),
    note: z.string().optional(),
  })
  .superRefine((series, ctx) => {
    const pattern = series.periodicity === 'FY' ? FISCAL_YEAR_PATTERN : CALENDAR_YEAR_PATTERN;
    for (const key of Object.keys(series.values)) {
      if (!pattern.test(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `year key "${key}" does not match periodicity ${series.periodicity}`,
          path: ['values', key],
        });
      }
    }
  });

/**
 * The honesty badges (ADR-0002, amended by ADR-0011). Four describe facts and arithmetic. The
 * fifth, `simulated`, marks a judgement nobody published: what a minister says, how a market
 * reads a Budget, what a household feels. It may quote sources and read engine numbers, but it
 * never produces a number of its own, and no lever or preset may carry it.
 */
export const badgeSchema = z.enum([
  'direct',
  'mechanical',
  'assumption',
  'commentary',
  'simulated',
]);
