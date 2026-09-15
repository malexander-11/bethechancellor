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
