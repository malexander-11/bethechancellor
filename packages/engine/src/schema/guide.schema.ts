import { z } from 'zod';
import { journeyStepSchema } from './journey.schema.js';
import { sourceRefSchema } from './provenance.schema.js';

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * The guide (Phase 9, cut to one line in Phase 23): the heading of each screen and what to do
 * now, in plain English, plus a glossary of the words a newcomer will not know, opened where the
 * word is used. Both are chrome: no badge, and no figure unless it carries a source (guide.test.ts).
 *
 * A term in square brackets, `[headroom]` or `[the OBR](obr)`, is a glossary reference; the page
 * renders it with the definition to hand.
 */
export const glossaryTermSchema = z.strictObject({
  term: z.string().min(1).max(40),
  short: z.string().min(1).max(240),
  sources: z.array(sourceRefSchema).default([]),
});

export const glossaryFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  terms: z.record(slug, glossaryTermSchema),
});

export const guideStageSchema = z.strictObject({
  step: journeyStepSchema,
  /** Which of the six steps this screen belongs to (Phase 24); step 4's screens share one. */
  number: z.number().int().min(1).max(6),
  title: z.string().min(1).max(60),
  /** The one line under the heading: what to do on this screen. */
  now: z.string().min(1).max(200),
});

export const guideFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    stages: z.array(guideStageSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.stages.forEach((stage, i) => {
      if (seen.has(stage.step))
        ctx.addIssue({
          code: 'custom',
          message: `two guide entries for ${stage.step}`,
          path: ['stages', i, 'step'],
        });
      seen.add(stage.step);
    });
  });
