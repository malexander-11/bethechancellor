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

/* ------------------------------------------------------------------ the PM */

/** A flagship the PM can offer: a lever and the value that delivers it, with its provenance. */
export const flagshipSchema = z.strictObject({
  id: slug,
  title: z.string().min(1),
  /** One line on what it is and why the PM wants it. */
  headline: z.string().min(1).max(160),
  /** The lever setting that delivers it. Cost is read live from the engine, never written here. */
  target: z.strictObject({ code: z.string().min(1), value: z.number() }),
  /** What buying it does and does not buy: places not meals, capacity not cash. Sourced. */
  delivery: simulatedLineSchema,
  /** Where the commitment comes from. */
  sources: z.array(sourceRefSchema).min(1),
});

export const themeSchema = z.strictObject({
  id: slug,
  title: z.string().min(1),
  purpose: z.string().min(1).max(160),
  /** The PM's pitch for this theme, in the PM's voice. */
  pitch: simulatedLineSchema,
  flagships: z.array(slug).min(2),
});

/**
 * A promise the PM asks the Chancellor to keep. `breaks` is a detector: the promise is broken
 * when any listed lever is on the wrong side of its default (or on at all, for a toggle).
 */
const basePromiseSchema = z.strictObject({
  id: slug,
  title: z.string().min(1),
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
  /** Empty for a promise the verdicts judge (the fiscal rules) rather than a lever. */
  breaks: z.array(
    z.strictObject({
      code: z.string().min(1),
      when: z.enum(['above', 'below', 'on']),
    }),
  ),
});

export const promiseSchema = basePromiseSchema.extend({
  /** Whether the Chancellor may push back on this one, and what the PM says if they do. */
  pushBack: z
    .strictObject({
      ask: z.string().min(1),
      reply: simulatedLineSchema,
      /** A narrower promise the PM extracts in return for releasing this one; absent = refusal. */
      concession: basePromiseSchema.optional(),
    })
    .optional(),
});

export const pmFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** What the PM has already done, said before asking for anything. Every fact sourced. */
    opening: z.array(simulatedLineSchema).min(1),
    themes: z.array(themeSchema).min(2),
    flagships: z.array(flagshipSchema).min(4),
    /** Flagships the PM offers whichever theme is chosen. */
    crossCutting: z.array(slug).default([]),
    promises: z.array(promiseSchema).min(1),
    /** The PM's reaction to each flagship being chosen, in the PM's voice. */
    reactions: z.record(slug, simulatedLineSchema),
    /** Stage 5: what the PM says when asked to drop a priority or release a promise. */
    renegotiation: z.strictObject({
      dropPriority: simulatedLineSchema,
      releasePromise: simulatedLineSchema,
      refuse: simulatedLineSchema,
    }),
  })
  .superRefine((file, ctx) => {
    const flagships = new Set(file.flagships.map((f) => f.id));
    file.themes.forEach((t, i) =>
      t.flagships.forEach((id, j) => {
        if (!flagships.has(id))
          ctx.addIssue({
            code: 'custom',
            message: `theme ${t.id} offers unknown flagship ${id}`,
            path: ['themes', i, 'flagships', j],
          });
      }),
    );
    file.crossCutting.forEach((id, j) => {
      if (!flagships.has(id))
        ctx.addIssue({
          code: 'custom',
          message: `unknown flagship ${id}`,
          path: ['crossCutting', j],
        });
    });
    for (const id of Object.keys(file.reactions)) {
      if (!flagships.has(id))
        ctx.addIssue({
          code: 'custom',
          message: `reaction for unknown flagship ${id}`,
          path: ['reactions', id],
        });
    }
  });
