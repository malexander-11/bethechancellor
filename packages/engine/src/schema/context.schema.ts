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

/** One published row of a forecast comparison, copied as printed. */
const rangeRowSchema = z.strictObject({
  label: z.string().min(1),
  series: z.record(z.string(), z.number()),
});

/**
 * The published range around a reading: the highest and lowest figures in a comparison of
 * independent forecasts, and the row from the same table they are measured against.
 *
 * `against` exists because a reading's headline `obr` block can be on a different basis. The rates
 * reading compares 10-year gilt yields, which no forecaster in the comparison publishes; its range
 * is a Bank Rate range, so it carries the Bank Rate comparator and says so in `note`. Smoothing
 * that over would be the dishonest thing, so the schema makes it impossible to omit.
 */
const alternativesSchema = z.strictObject({
  source: sourceRefSchema,
  note: z.string().min(1),
  against: rangeRowSchema,
  /**
   * The lowest and highest figures any forecaster in the comparison publishes, year by year.
   * Named for what they are rather than for the cards they feed: which of them is the optimistic
   * case depends on which way the slider moves borrowing, and for a growth reading that is the
   * other way round. Per-cell extremes, so each is an envelope rather than one forecaster's view.
   */
  lowest: rangeRowSchema,
  highest: rangeRowSchema,
});

export const contextReadingSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  unit: z.enum(['pct', 'pp', 'GBPbn']),
  /** Macro lever this reading can set; readings without one are context only. */
  leverCode: z.string().optional(),
  obr: readingValueSchema,
  latest: readingValueSchema,
  suggestion: suggestionRuleSchema.optional(),
  alternatives: alternativesSchema.optional(),
  text: z.string().min(1),
});

/** Which of the four sets of assumptions a card offers. */
export const scenarioKindSchema = z.enum(['baseline', 'adviser', 'optimistic', 'pessimistic']);

/**
 * One card on the assumptions step. Carries the words only: the slider settings are derived from
 * the readings above by a stated rule, never authored here, so tampering with a published row
 * moves the card and a test catches it.
 */
export const contextScenarioSchema = z.strictObject({
  kind: scenarioKindSchema,
  title: z.string().min(1),
  headline: z.string().min(1).max(160),
  rationale: z
    .array(
      z.strictObject({
        text: z.string().min(1),
        sources: z.array(sourceRefSchema).default([]),
      }),
    )
    .min(1),
});

/**
 * A decision the government has already taken since the forecast was published: what it costs on
 * the government's own figure, and what paid for it. Context, not a lever: none of it is in the
 * player's Budget, and the OBR has not yet certified any of it.
 */
export const decisionSinceForecastSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1).max(90),
  /** £ million; negative costs money. */
  amountGbpm: z.number(),
  /** The year or period the figure is for, as the source states it. */
  year: z.string().min(1).max(24),
  paidFor: z.string().min(1).max(120),
  sources: z.array(sourceRefSchema).min(1),
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
  scenarios: z.array(contextScenarioSchema).optional(),
  decisionsSinceForecast: z.array(decisionSinceForecastSchema).default([]),
});
