import { z } from 'zod';
import { journeyStepSchema } from './journey.schema.js';
import { isoDateSchema, sourceRefSchema } from './provenance.schema.js';

/**
 * The game layer (ADR-0011, ADR-0012). Everything in these files is a judgement nobody published,
 * so every item carries `badge: 'simulated'` as a literal: no text can pretend to be a costing.
 * Numbers are never authored here; where a file names a figure it names a *published candidate*
 * (`obr`, `adviser`, `lowest`, `highest`) or a *consideration id*, and the engine derives the value.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

export const simulatedBadgeSchema = z.literal('simulated');

/** A line of simulated speech: what it says, and the published facts it leans on. */
export const simulatedLineSchema = z.strictObject({
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).default([]),
  badge: simulatedBadgeSchema,
});

/**
 * Which published figure a slider takes in a draw. `obr` is the March path, `adviser` is the
 * suggestion rule (today's gap, or the authored value), `lowest`/`highest` are the rows of HM
 * Treasury's comparison the context file carries. The value is derived, never typed.
 */
export const macroCandidateSchema = z.enum(['obr', 'adviser', 'lowest', 'highest']);

/**
 * A revision the in-game OBR applies to any lever carrying the named consideration. The
 * consideration is the source: a lever without a sourced uncertainty caveat is never re-scored.
 */
export const drawRevisionSchema = z.strictObject({
  considerationId: slug,
  factor: z.number().min(0).max(1.5),
  note: z.string().min(1),
});

export const drawOutcomeSchema = z.strictObject({
  id: slug,
  title: z.string().min(1),
  weight: z.number().int().positive(),
  macro: z.record(z.string(), macroCandidateSchema),
  story: simulatedLineSchema.extend({ headline: z.string().min(1).max(160) }),
  /** What the Political Adviser's press summary says in stage 3: the foreshadowing. */
  clue: simulatedLineSchema.extend({ headline: z.string().min(1).max(120) }),
  revisions: z.array(drawRevisionSchema),
});

export const drawsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** The honesty text shown under the envelope. */
    disclosure: z.string().min(1),
    outcomes: z.array(drawOutcomeSchema).min(2),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    file.outcomes.forEach((o, i) => {
      if (ids.has(o.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate outcome ${o.id}`,
          path: ['outcomes', i, 'id'],
        });
      ids.add(o.id);
    });
  });

/** The in-game calendar: which date each stage is played on. The Budget date comes from the Charter. */
export const calendarSchema = z.strictObject({
  schemaVersion: z.literal(1),
  stages: z
    .array(
      z.strictObject({
        step: journeyStepSchema,
        on: isoDateSchema,
        label: z.string().min(1),
      }),
    )
    .min(1),
});
