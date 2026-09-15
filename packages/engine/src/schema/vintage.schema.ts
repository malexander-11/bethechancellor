import { z } from 'zod';
import {
  fiscalYearSchema,
  isoDateSchema,
  seriesSchema,
  sourceRefSchema,
} from './provenance.schema.js';

const scalarAssumptionSchema = z.strictObject({
  value: z.number(),
  period: z.string().optional(),
  source: sourceRefSchema,
});

/** An OBR ready-reckoner sensitivity: the effect on borrowing of a unit change in an economic determinant. */
export const sensitivitySchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  unit: z.literal('pp'),
  perUnit: z.number().positive(),
  /** £ million effect on PSNB by fiscal year for a +perUnit change. Positive = more borrowing. */
  effectOnPsnbGbpm: z.record(fiscalYearSchema, z.number()),
  /** Optional asymmetric table for a −perUnit change (values are the effect of the decrease). */
  effectOnPsnbGbpmDecrease: z.record(fiscalYearSchema, z.number()).optional(),
  currentBudgetShare: z.number().min(0).max(1),
  adjusts: z
    .array(
      z.strictObject({
        target: z.enum(['nominalGdp', 'marginalInterestRate']),
        how: z.string(),
      }),
    )
    .optional(),
  rampNote: z.string(),
  provisional: z.boolean().optional(),
  source: sourceRefSchema,
  secondarySource: sourceRefSchema.optional(),
});

export const welfareCapStatusSchema = z.enum(['withinCap', 'aboveCapWithinMargin', 'aboveMargin']);

export const vintageSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  permalinkCode: z.string().regex(/^[a-z0-9]{3,12}$/),
  organisation: z.string().min(1),
  event: z.string().min(1),
  publishedOn: isoDateSchema,
  primarySource: sourceRefSchema,
  years: z.strictObject({
    outturn: z.array(fiscalYearSchema).min(1),
    inYear: fiscalYearSchema,
    forecast: z.array(fiscalYearSchema).length(5),
  }),
  economy: z.strictObject({
    nominalGdpFy: seriesSchema,
    nominalGdpCentred: seriesSchema,
    realGdpGrowth: seriesSchema,
    cpiInflation: seriesSchema,
    rpiInflation: seriesSchema.optional(),
    unemploymentRate: seriesSchema.optional(),
    conditioningAssumptions: z.record(z.string(), scalarAssumptionSchema),
  }),
  fiscal: z.strictObject({
    psnb: seriesSchema,
    currentBudgetDeficit: seriesSchema,
    psni: seriesSchema,
    psnfl: seriesSchema,
    psnflPctGdp: seriesSchema.optional(),
    psnflOtherFlows: seriesSchema,
    receipts: seriesSchema,
    tme: seriesSchema,
    rdel: seriesSchema,
    cdel: seriesSchema,
    welfareTotal: seriesSchema,
    welfareInCap: seriesSchema,
    welfareComponents: z.record(z.string(), seriesSchema).optional(),
    debtInterestNetApf: seriesSchema,
    receiptsByHeadPctGdp: z.record(z.string(), seriesSchema),
    /** £ million receipts by individual tax (EFO detailed Table A.5). */
    receiptsByTax: z.record(z.string(), seriesSchema).optional(),
    spendingComponentsPctGdp: z.record(z.string(), seriesSchema).optional(),
  }),
  assumptions: z.strictObject({
    marginalInterestRateOnNewBorrowingPct: seriesSchema,
    halfYearConvention: z.literal(true),
  }),
  sensitivities: z.array(sensitivitySchema),
  uncertainty: z.strictObject({
    receiptsMeanAbsFiveYearErrorPctGdp: z.number().positive(),
    source: sourceRefSchema,
  }),
  checks: z.strictObject({
    stabilityHeadroomGbpm: z.strictObject({
      year: fiscalYearSchema,
      value: z.number(),
      toleranceGbpm: z.number().positive(),
      source: sourceRefSchema,
    }),
    psnflChangePctGdp: z.strictObject({
      year: fiscalYearSchema,
      value: z.number(),
      tolerancePp: z.number().positive(),
      source: sourceRefSchema,
    }),
    welfareCapStatus: z.strictObject({
      year: fiscalYearSchema,
      value: welfareCapStatusSchema,
    }),
  }),
  context: z
    .strictObject({
      headroomAtPublicationGbpm: z.number().optional(),
      notes: z.array(z.string()),
    })
    .optional(),
});
