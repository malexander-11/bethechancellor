import { z } from 'zod';
import { isoDateSchema, sourceRefSchema } from './provenance.schema.js';

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * A published figure the analysis page reads, £ million, with the passage it is read from: the
 * steps of the margin since the last forecast, which no engine run can produce.
 */
export const budgetFactSchema = z.strictObject({
  gbpm: z.number(),
  source: sourceRefSchema,
});

/**
 * One line of the Treasury's scorecard, in plain words (ADR-0045): what the Budget did, joined to
 * its figures by the line number, so the page copies no number. A measure the game offers as a
 * lever names it; one it does not, and a reader might expect to, says why.
 */
export const budgetMeasureSchema = z.strictObject({
  id: z.string().regex(/^m[0-9]{1,3}$/),
  line: z.number().int().positive(),
  /** One or two short sentences a newcomer reads, held to the readability test. */
  plain: z.string().min(1).max(200),
  /** The lever that reverses or resizes it: costed from this line, live, and on step 4. */
  leverCode: z.string().min(1).optional(),
  /** Why a measure of a size a reader would expect to move cannot be moved. */
  notMovable: z.strictObject({ reason: z.string().min(1).max(160) }).optional(),
});

/**
 * The Budget the game starts from (ADR-0045): the one place a person is named, the scorecard its
 * measures join to, the published steps of the margin, the story in plain words with the figures
 * left as placeholders for the engine to fill, and every measure once.
 */
export const budgetFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: slug,
    title: z.string().min(1).max(60),
    deliveredOn: isoDateSchema,
    chancellor: z.strictObject({ name: z.string().min(1).max(60), source: sourceRefSchema }),
    /** The source id of the scorecard extract the measures join to by line. */
    scorecard: z.string().min(1),
    facts: z.strictObject({
      headroomInMarchGbpm: budgetFactSchema,
      debtInterestSinceMarchGbpm: budgetFactSchema,
      otherChangesSinceMarchGbpm: budgetFactSchema,
      headroomBeforeMeasuresGbpm: budgetFactSchema,
      measuresOnCurrentBudgetGbpm: budgetFactSchema,
    }),
    story: z
      .array(z.strictObject({ text: z.string().min(1), sources: z.array(sourceRefSchema).min(1) }))
      .min(1),
    measures: z.array(budgetMeasureSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    const lines = new Set<number>();
    file.measures.forEach((m, i) => {
      if (ids.has(m.id))
        ctx.addIssue({ code: 'custom', message: `two measures ${m.id}`, path: ['measures', i] });
      if (lines.has(m.line))
        ctx.addIssue({
          code: 'custom',
          message: `line ${m.line} is listed twice`,
          path: ['measures', i, 'line'],
        });
      if (m.leverCode && m.notMovable)
        ctx.addIssue({
          code: 'custom',
          message: `${m.id} is a lever and says it cannot be moved`,
          path: ['measures', i, 'notMovable'],
        });
      ids.add(m.id);
      lines.add(m.line);
    });
  });
