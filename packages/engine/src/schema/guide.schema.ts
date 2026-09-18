import { z } from 'zod';
import { journeyStepSchema } from './journey.schema.js';
import { sourceRefSchema } from './provenance.schema.js';

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * The guide (Phase 9): what a player is doing on each screen, why it matters and what to do now,
 * in plain English, plus a glossary of the dozen words a newcomer will not know. Both are chrome,
 * like the dateline: no badge, and no figure unless it carries a source (guide.test.ts).
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
  /** Which of the seven steps this screen belongs to; the desk's three tabs share one. */
  number: z.number().int().min(1).max(7),
  title: z.string().min(1).max(60),
  doing: z.string().min(1).max(200),
  why: z.string().min(1).max(220),
  now: z.string().min(1).max(200),
  /** Glossary ids to list under "Words on this page", besides those the text brackets. */
  terms: z.array(slug).default([]),
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
