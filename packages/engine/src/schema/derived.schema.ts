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
