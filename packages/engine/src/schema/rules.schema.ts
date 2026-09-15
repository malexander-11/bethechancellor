import { z } from 'zod';
import { fiscalYearSchema, isoDateSchema, sourceRefSchema } from './provenance.schema.js';

const currentBudgetRuleSchema = z.strictObject({
  kind: z.literal('currentBudget'),
  id: z.string().min(1),
  name: z.string().min(1),
  fixedTargetYear: fiscalYearSchema,
  rollingFromThirdYear: z.literal(true),
  requirementBeforeRolling: z.literal('surplus'),
  requirementOnceRolling: z.literal('balanceOrSurplus'),
  balanceTolerancePctGdp: z.number().min(0),
  charterText: z.string().min(1),
  toleranceText: z.string().optional(),
  plainEnglish: z.string().min(1),
  source: sourceRefSchema,
  toleranceSource: sourceRefSchema.optional(),
});

const stockFallingRuleSchema = z.strictObject({
  kind: z.literal('stockFalling'),
  id: z.string().min(1),
  name: z.string().min(1),
  metric: z.literal('psnfl'),
  fixedTargetYear: fiscalYearSchema,
  rollingFromThirdYear: z.literal(true),
  charterText: z.string().min(1),
  plainEnglish: z.string().min(1),
  source: sourceRefSchema,
});

const welfareCapRuleSchema = z.strictObject({
  kind: z.literal('welfareCap'),
  id: z.string().min(1),
  name: z.string().min(1),
  capYear: fiscalYearSchema,
  capGbpm: z.number().positive(),
  marginPct: z.number().min(0),
  formalAssessment: z.string().min(1),
  mode: z.enum(['monitor', 'assess']),
  charterText: z.string().min(1),
  plainEnglish: z.string().min(1),
  source: sourceRefSchema,
  capSource: sourceRefSchema.optional(),
});

export const fiscalRuleSchema = z.discriminatedUnion('kind', [
  currentBudgetRuleSchema,
  stockFallingRuleSchema,
  welfareCapRuleSchema,
]);

export const ruleSetSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  permalinkCode: z.string().regex(/^[a-z0-9]{3,12}$/),
  title: z.string().min(1),
  inForceFrom: isoDateSchema,
  source: sourceRefSchema,
  assessment: z.strictObject({
    formalCadence: z.string().min(1),
    nextFormalAssessmentOn: isoDateSchema,
    note: z.string().optional(),
  }),
  escapeClause: z.strictObject({
    text: z.string().min(1),
    source: sourceRefSchema,
  }),
  rules: z.array(fiscalRuleSchema).min(1),
});
