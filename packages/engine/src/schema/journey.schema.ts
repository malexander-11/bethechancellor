import { z } from 'zod';
import { sourceRefSchema } from './provenance.schema.js';

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/** The steps of the guided Budget journey. */
export const journeyStepSchema = z.enum([
  'start',
  'assumptions',
  'taxes',
  'spending',
  'recommendations',
  'budget-day',
]);

/** An adviser is a role, not a person: title, remit and the steps they speak on. */
export const adviserSchema = z.strictObject({
  id: slug,
  role: z.string().min(1),
  remit: z.string().min(1),
  steps: z.array(journeyStepSchema).min(1),
});

export const advisersFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  advisers: z.array(adviserSchema).min(1),
});

/** One paragraph of briefing; every paragraph cites the documents it rests on. */
export const briefingParagraphSchema = z.strictObject({
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
});

export const briefingFactSchema = z.strictObject({
  label: z.string().min(1),
  value: z.string().min(1),
  source: sourceRefSchema,
});

/**
 * A briefing belongs to a step and, optionally, to one lever group within it (the step's
 * overview has no group). The adviser named must exist and speak on that step.
 */
export const briefingSchema = z.strictObject({
  id: slug,
  step: journeyStepSchema,
  group: z.string().min(1).optional(),
  adviser: slug,
  title: z.string().min(1),
  /** The one line the adviser says out loud. The paragraphs are the detail behind it. */
  headline: z.string().min(1).max(140),
  paragraphs: z.array(briefingParagraphSchema).min(1),
  facts: z.array(briefingFactSchema).optional(),
});

export const briefingsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  briefings: z.array(briefingSchema).min(1),
});

/** Which panel of the Budget day feedback a signal belongs to. */
export const reactionAudienceSchema = z.enum(['rules', 'markets', 'parliament', 'public']);

/**
 * What a signal reads off the outcome. Every one is a number so a band can be chosen
 * deterministically; statuses are encoded as 0 for the best case and upwards.
 */
export const reactionMeasureSchema = z.enum([
  'stabilityHeadroomGbpm',
  'stabilityHeadroomVsTypicalError',
  'investmentRuleStatus',
  'welfareCapStatus',
  'borrowingChangeGbpm',
  'debtChangePp',
  'debtFallingPp',
  'taxTakeChangePp',
  'recommendationsAdopted',
  'budget2025Reversals',
]);

/**
 * One band of a signal. Bands are read in order and the first whose `upTo` the reading does not
 * exceed wins; the last band carries no `upTo` and catches everything above.
 */
export const reactionBandSchema = z.strictObject({
  id: slug,
  upTo: z.number().optional(),
  level: z.enum(['good', 'mixed', 'bad', 'neutral']),
  headline: z.string().min(1).max(140),
  detail: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
});

export const reactionSignalSchema = z
  .strictObject({
    id: slug,
    audience: reactionAudienceSchema,
    measure: reactionMeasureSchema,
    /** How the reading is written out beside the text. */
    reading: z.strictObject({
      label: z.string().min(1),
      unit: z.enum(['GBPm', 'pp', 'ratio', 'count', 'status']),
    }),
    bands: z.array(reactionBandSchema).min(2),
  })
  .superRefine((signal, ctx) => {
    const last = signal.bands[signal.bands.length - 1];
    if (last?.upTo !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'the last band must have no upTo so every reading lands somewhere',
        path: ['bands'],
      });
    }
    let previous = -Infinity;
    signal.bands.forEach((band, i) => {
      if (band.upTo === undefined) return;
      if (band.upTo <= previous) {
        ctx.addIssue({
          code: 'custom',
          message: 'band thresholds must increase',
          path: ['bands', i, 'upTo'],
        });
      }
      previous = band.upTo;
    });
  });

export const reactionsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  /** The one line above the four panels. */
  intro: z.string().min(1),
  signals: z.array(reactionSignalSchema).min(1),
});
