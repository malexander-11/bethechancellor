import { z } from 'zod';
import { isoDateSchema, sourceRefSchema } from './provenance.schema.js';

/** One side of a comparison: a scalar or a series by year, with where it comes from. */
const readingValueSchema = z
  .strictObject({
    value: z.number().optional(),
    series: z.record(z.string(), z.number()).optional(),
    label: z.string().min(1),
    source: sourceRefSchema,
  })
  .refine((v) => v.value !== undefined || v.series !== undefined, {
    message: 'a reading needs a value or a series',
  });

/** How the advisers turn a reading into a suggested slider setting (methodology §11). */
export const suggestionRuleSchema = z.discriminatedUnion('rule', [
  /** latest minus OBR (mean over shared years for a series), rounded to the slider step and clamped. */
  z.strictObject({ rule: z.literal('gap') }),
  /** An authored value with the reasoning shown to the player. */
  z.strictObject({ rule: z.literal('authored'), value: z.number(), rationale: z.string().min(1) }),
]);

export const contextReadingSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  unit: z.enum(['pct', 'pp', 'GBPbn']),
  /** Macro lever this reading can set; readings without one are context only. */
  leverCode: z.string().optional(),
  obr: readingValueSchema,
  latest: readingValueSchema,
  suggestion: suggestionRuleSchema.optional(),
  text: z.string().min(1),
});

/** "What has changed since the forecast": dated readings compared with the vintage's assumptions. */
export const contextFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[0-9]{4}-[0-9]{2}$/),
  title: z.string().min(1),
  asOf: isoDateSchema,
  vintageId: z.string().min(1),
  adviser: z.string().min(1),
  intro: z.string().min(1),
  readings: z.array(contextReadingSchema).min(1),
});
