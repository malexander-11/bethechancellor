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

/** A sum in billions: the money on a card is the scorecard's and the engine's, never typed. */
const BILLIONS = /£\s?[\d.,]+\s?bn|\bbillions?\b/i;

/**
 * One of the Chancellor's decisions as the walk asks about it (ADR-0046): the lever that reverses
 * it, what the Chancellor did in a heading, and what that means in a few plain sentences. A lever
 * that reverses several lines is one card. The figure beside it is read from the scorecard, so the
 * words name no sum in billions.
 */
export const budgetCardSchema = z.strictObject({
  lever: z.string().min(1),
  /** What the Chancellor did, as a heading: "Savings interest taxed two points more". */
  title: z.string().min(1).max(60),
  /** What it means, in one to three short sentences, held to the readability test. */
  explain: z
    .string()
    .min(1)
    .max(280)
    .refine((text) => !BILLIONS.test(text), 'a card names no sum in billions'),
});

/** A page of the walk: a theme, a line saying what it covers, and its cards, a few at a time. */
export const budgetThemeSchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(40),
  lead: z.string().min(1).max(140),
  cards: z.array(budgetCardSchema).min(1).max(8),
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
    /** The walk (ADR-0046): every measure a player can reverse, on one card of one theme. */
    themes: z.array(budgetThemeSchema).min(1).max(8),
  })
  .superRefine((file, ctx) => {
    const themes = new Set<string>();
    const carded = new Set<string>();
    file.themes.forEach((theme, t) => {
      if (themes.has(theme.id))
        ctx.addIssue({ code: 'custom', message: `two themes ${theme.id}`, path: ['themes', t] });
      themes.add(theme.id);
      theme.cards.forEach((card, c) => {
        if (carded.has(card.lever))
          ctx.addIssue({
            code: 'custom',
            message: `${card.lever} is on two cards`,
            path: ['themes', t, 'cards', c, 'lever'],
          });
        carded.add(card.lever);
      });
    });
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
