import { z } from 'zod';
import { fiscalYearSchema } from './provenance.schema.js';

const extractSourceSchema = z.strictObject({
  sourceId: z.string().min(1),
  localPath: z.string().min(1),
  sha256: z.string().nullable(),
});

/** Output of the pipeline's HMRC ready-reckoner extraction. */
export const hmrcExtractSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  sheet: z.string().min(1),
  years: z.array(fiscalYearSchema).length(3),
  rows: z.array(
    z.strictObject({
      rowId: z.string().min(1),
      section: z.string(),
      label: z.string().min(1),
      values: z.record(fiscalYearSchema, z.number().nullable()),
      negligible: z.record(fiscalYearSchema, z.boolean()),
    }),
  ),
  notes: z.array(z.string()),
  source: extractSourceSchema,
});

/**
 * Output of the pipeline's Spending Review 2025 departmental DEL tables extraction. Values are
 * £ million (the published tables are £ billion); real growth is a fraction a year as published.
 */
export const sr25ExtractSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  tables: z
    .array(
      z.strictObject({
        sheet: z.string().min(1),
        title: z.string().min(1),
        unit: z.literal('GBPm'),
        publishedUnit: z.string(),
        years: z.array(fiscalYearSchema).min(1),
        realGrowthPeriods: z.array(z.string()),
        rows: z
          .array(
            z.strictObject({
              rowId: z.string().min(1),
              label: z.string().min(1),
              /** "of which" and "Memo:" rows: context only, never part of a total. */
              memo: z.boolean(),
              values: z.record(fiscalYearSchema, z.number().nullable()),
              averageAnnualRealGrowth: z.record(z.string(), z.number().nullable()),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
  source: extractSourceSchema,
});

/** Output of the pipeline's Budget 2025 Table 4.1 extraction. HMT sign: positive reduces borrowing. */
export const scorecardExtractSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  sheet: z.string().min(1),
  years: z.array(fiscalYearSchema).min(1),
  signConvention: z.literal('positiveReducesBorrowing'),
  measures: z.array(
    z.strictObject({
      number: z.number().int().positive(),
      title: z.string().min(1),
      type: z.enum(['Tax', 'Spend']),
      values: z.record(fiscalYearSchema, z.number()),
    }),
  ),
  source: extractSourceSchema,
});

/**
 * Output of the pipeline's extraction of HMRC's "Estimated cost of tax reliefs" (Table 2, six-year
 * cost estimates, £ million). These are the static cost of each relief, not the yield from removing it.
 */
export const reliefExtractSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1),
  sheet: z.string().min(1),
  title: z.string().min(1),
  years: z.array(fiscalYearSchema).min(1),
  rows: z
    .array(
      z.strictObject({
        rowId: z.string().min(1),
        code: z.string(),
        name: z.string().min(1),
        taxType: z.string(),
        reliefType: z.string(),
        firstForecastYear: z.string(),
        values: z.record(fiscalYearSchema, z.number().nullable()),
        negligible: z.record(fiscalYearSchema, z.boolean()),
        /** HMRC's text where no number is published ("Not available", "Disclosive", …). */
        markers: z.record(fiscalYearSchema, z.string()),
        description: z.string(),
      }),
    )
    .min(1),
  source: extractSourceSchema,
});
