import { z } from 'zod';
import { journeyStepSchema, readingMeasureSchema } from './journey.schema.js';
import { isoDateSchema, sourceRefSchema } from './provenance.schema.js';

/**
 * The game layer (ADR-0011, ADR-0012). Everything in these files is a judgement nobody published,
 * so every item carries `badge: 'simulated'` as a literal: no text can pretend to be a costing.
 * Numbers are never authored here; where a file names a figure it names a *published candidate*
 * (`obr`, `adviser`, `lowest`, `highest`) or a *consideration id*, and the engine derives the value.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

export const simulatedBadgeSchema = z.literal('simulated');

/**
 * A line of simulated speech: what it says, and the published facts it leans on. `short` is the
 * same line in at most eighteen words, shown first; the full text sits one click behind it. A
 * figure in the short line is a figure in the full line, so the sources cover both.
 */
export const simulatedLineSchema = z.strictObject({
  text: z.string().min(1),
  short: z.string().min(1).max(140).optional(),
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

/**
 * A priority the Chancellor can rank with the Prime Minister (Phase 18): what the Budget is for.
 * Nothing is funded by ranking one; the ways to deliver it are options (options.json) proposed
 * by the minister or adviser who leads on it. Every line is in someone's voice and sourced.
 */
export const prioritySchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(40),
  /** The priority as a noun phrase for a sentence: "the cost of living", "defence". */
  noun: z.string().min(1).max(40),
  purpose: z.string().min(1).max(160),
  /** The PM's case for it, in the PM's voice. */
  pitch: simulatedLineSchema,
  /** What the PM says when it is ranked. */
  reaction: simulatedLineSchema,
  /** The role that leads on delivering it: an adviser's or a minister's, as the data names them. */
  lead: z.string().min(1),
  /** The lead's line opening the ways to deliver it. */
  brief: simulatedLineSchema,
  /** Where the commitment comes from. */
  sources: z.array(sourceRefSchema).min(1),
});

/**
 * A manifesto red line. `breaks` is a detector: the promise is broken when any listed lever is
 * on the wrong side of its default (or on at all, for a toggle). The red lines are fixed: there
 * is no negotiating them away (Phase 9), only crossing them and being judged for it.
 */
export const promiseSchema = z.strictObject({
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

export const pmFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** What the PM has already done, said before asking for anything. Every fact sourced. */
    opening: z.array(simulatedLineSchema).min(1),
    /** What this Budget could be for; the Chancellor ranks up to three. */
    priorities: z.array(prioritySchema).min(6).max(10),
    promises: z.array(promiseSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    file.priorities.forEach((p, i) => {
      if (ids.has(p.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate priority ${p.id}`,
          path: ['priorities', i],
        });
      ids.add(p.id);
    });
  });

/* ------------------------------------------------------------ the options */

/**
 * A bundle of lever settings an adviser can propose (Phase 18, ADR-0022): one or two levers and
 * the values that deliver it. Cost, yield, badge, earliest start and red lines are all read from
 * the levers and the engine on the page; nothing here carries a number. Two options on one screen
 * never share a lever, so whether an option is on, adjusted or off follows from the lever values.
 */
export const optionBundleSchema = z
  .record(z.string().min(1), z.number())
  .refine((v) => Object.keys(v).length >= 1 && Object.keys(v).length <= 2, {
    message: 'an option moves one or two levers',
  });

/** A way to deliver a priority, proposed by the minister or adviser who leads on it. */
export const deliverOptionSchema = z.strictObject({
  id: slug,
  /** The priority this delivers (an id in pm.json's priorities). */
  priority: slug,
  title: z.string().min(1).max(80),
  /** What choosing it buys and does not buy, in the proposer's voice. Sourced. */
  line: simulatedLineSchema,
  values: optionBundleSchema,
});

/** A way to pay for it: the levers say everything the card needs, so the line is optional. */
export const affordOptionSchema = z.strictObject({
  id: slug,
  values: optionBundleSchema,
  line: simulatedLineSchema.optional(),
});

/** A little add-on for the speech: small, costed, with the adviser's line on how it lands. */
export const addOnSchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(80),
  values: optionBundleSchema,
  line: simulatedLineSchema,
});

function noSharedLever(
  options: readonly { id: string; values: Record<string, number> }[],
  screen: string,
  ctx: z.RefinementCtx,
): void {
  const seen = new Map<string, string>();
  options.forEach((o, i) => {
    for (const code of Object.keys(o.values)) {
      const other = seen.get(code);
      if (other)
        ctx.addIssue({
          code: 'custom',
          message: `${screen} options ${other} and ${o.id} both move lever ${code}`,
          path: [screen, i, 'values', code],
        });
      seen.set(code, o.id);
    }
  });
}

export const optionsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    deliver: z.array(deliverOptionSchema).min(1),
    afford: z.array(affordOptionSchema).min(1),
    addOns: z.array(addOnSchema).min(2),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    for (const [screen, list] of [
      ['deliver', file.deliver],
      ['afford', file.afford],
      ['addOns', file.addOns],
    ] as const) {
      list.forEach((o, i) => {
        if (ids.has(o.id))
          ctx.addIssue({ code: 'custom', message: `duplicate option ${o.id}`, path: [screen, i] });
        ids.add(o.id);
      });
      noSharedLever(list, screen, ctx);
    }
    // A way to deliver and a way to afford on one lever would silently undo each other.
    const delivering = new Map<string, string>();
    for (const o of file.deliver)
      for (const code of Object.keys(o.values)) delivering.set(code, o.id);
    file.afford.forEach((o, i) => {
      for (const code of Object.keys(o.values)) {
        const other = delivering.get(code);
        if (other)
          ctx.addIssue({
            code: 'custom',
            message: `afford option ${o.id} and deliver option ${other} both move lever ${code}`,
            path: ['afford', i, 'values', code],
          });
      }
    });
  });

/* ------------------------------------------------------------ the package */

/**
 * A minister's line at a setting. The band applies when the lever's value is above `above` or
 * below `below` (both may be given). Bands are read in order; the first that applies wins, so a
 * deeper cut's line goes before the general one.
 */
export const ministerBandSchema = z.strictObject({
  appliesWhen: z
    .strictObject({ above: z.number().optional(), below: z.number().optional() })
    .refine((w) => w.above !== undefined || w.below !== undefined, {
      message: 'a band must say above or below what',
    }),
  line: simulatedLineSchema,
});

/**
 * The minister who speaks for one lever: what they ask for when it is untouched, what stops
 * happening at a cut, the case they made for more. Every line is simulated; the facts inside it
 * carry their sources. The role is a title, never a name.
 */
export const ministerSchema = z
  .strictObject({
    code: z.string().min(1),
    role: z.string().min(1),
    asking: simulatedLineSchema,
    whenCut: z.array(ministerBandSchema).default([]),
    whenRaised: z.array(ministerBandSchema).default([]),
  })
  .superRefine((m, ctx) => {
    if (m.whenCut.length === 0 && m.whenRaised.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `${m.code}: a minister who only asks has nothing to say when the lever moves`,
        path: ['whenCut'],
      });
    }
    m.whenCut.forEach((b, i) => {
      if (b.appliesWhen.below === undefined)
        ctx.addIssue({
          code: 'custom',
          message: 'a whenCut band must say below what',
          path: ['whenCut', i, 'appliesWhen'],
        });
    });
    m.whenRaised.forEach((b, i) => {
      if (b.appliesWhen.above === undefined)
        ctx.addIssue({
          code: 'custom',
          message: 'a whenRaised band must say above what',
          path: ['whenRaised', i, 'appliesWhen'],
        });
    });
  });

export const ministersFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    ministers: z.array(ministerSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const codes = new Set<string>();
    file.ministers.forEach((m, i) => {
      if (codes.has(m.code))
        ctx.addIssue({
          code: 'custom',
          message: `two ministers speak for ${m.code}`,
          path: ['ministers', i, 'code'],
        });
      codes.add(m.code);
    });
  });

/**
 * When an adviser speaks up on the package screens. A closed list of predicates over the ambition status and
 * the scorecard, not a language: each is evaluated by `interventionsFor`, and a new one needs code.
 */
export const interventionWhenSchema = z.enum([
  'promise-broken',
  'priority-unfunded',
  'priority-part-funded',
  'all-priorities-funded',
  'headroom-below-target',
  'headroom-above-target',
  'rule-missed',
]);

/**
 * An adviser's line on the package screens, shown when its predicate holds. `{name}` in the text is filled
 * with the title of the promise or flagship the predicate fired on: a title from data, never a
 * number. The line's own sources are for any fact it states beyond that.
 */
export const interventionSchema = z.strictObject({
  id: slug,
  adviser: slug,
  when: interventionWhenSchema,
  line: simulatedLineSchema,
});

export const interventionsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    interventions: z.array(interventionSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    file.interventions.forEach((x, i) => {
      if (ids.has(x.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate id ${x.id}`,
          path: ['interventions', i],
        });
      ids.add(x.id);
    });
  });

/* ------------------------------------------------------- the compromises */

/**
 * What the advisers say beside each route out of a gap (stage 5): raise more, spend less or
 * later (which since Phase 18 also narrows or drops a chosen option), accept less headroom, or
 * borrow and say so. One line per route, in the voice of the adviser named; the breach
 * assessment is the Permanent Secretary's and quotes the Charter. Everything simulated, every
 * fact sourced, no number authored.
 */
export const compromiseFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  routes: z.strictObject({
    revenue: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
    spending: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
    target: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
    breach: z.strictObject({
      adviser: slug,
      line: simulatedLineSchema,
      /** When no rule is missed: what leaving a gap means instead. */
      noBreach: simulatedLineSchema,
    }),
  }),
});

/* ------------------------------------------------------------- the rabbit */

/**
 * The add-ons screen's framing lines (stage 6). The add-ons themselves are options (options.json),
 * each a lever setting the engine prices; nothing here carries a number.
 */
export const rabbitFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  /** The Permanent Secretary sets the scene: what an add-on is for, and what it costs. */
  intro: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
  /** Raise a priority one notch beyond what was chosen. */
  further: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
  /** No add-on: the headroom is the announcement. */
  keep: z.strictObject({ adviser: slug, line: simulatedLineSchema }),
});

/* ---------------------------------------------------------- the electorate */

/** How one lever touches one household: the direction, and the line they say when it does. */
export const householdTouchSchema = z.strictObject({
  code: z.string().min(1),
  /** `on` for a toggle switched on; `above`/`below` the default for a slider; `moved` for either way. */
  when: z.enum(['on', 'above', 'below', 'moved']),
  effect: z.enum(['gains', 'pays']),
  line: simulatedLineSchema,
});

/**
 * A household archetype (stage 7): who they are, one sourced fact about people like them, the
 * levers that touch them, and what they say when nothing does. Simulated throughout; the fact
 * carries its source; no household ever quotes a number the engine did not compute.
 */
export const householdSchema = z.strictObject({
  id: slug,
  who: z.string().min(1),
  fact: simulatedLineSchema,
  touches: z.array(householdTouchSchema).min(1),
  untouched: simulatedLineSchema,
  /** Whether they could tell what the Budget was for: a theme delivered, or not. */
  understood: simulatedLineSchema,
  puzzled: simulatedLineSchema,
});

export const householdsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    households: z.array(householdSchema).min(3),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    file.households.forEach((h, i) => {
      if (ids.has(h.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate household ${h.id}`,
          path: ['households', i],
        });
      ids.add(h.id);
    });
  });

/* -------------------------------------------------------------- the speech */

/**
 * A fragment of the speech. `{…}` placeholders are filled by the assembler from the outcome and
 * the game: titles from data, figures from the engine, never a number typed here.
 */
export const speechFragmentSchema = z.strictObject({
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).default([]),
});

export const speechFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  /** Keyed by the first priority's id, plus `default` for none: {priorities}, {targetYear}. */
  opening: z.record(z.string(), speechFragmentSchema),
  /** One paragraph per priority delivered: {title}, {options}, {cost}, {targetYear}. */
  priority: speechFragmentSchema,
  /** Spending measures that are not flagships: {measures}. */
  spending: speechFragmentSchema,
  /** Budgets cut: {measures}. */
  cuts: speechFragmentSchema,
  /** Revenue paragraphs by who pays: {measures}, {yield}. */
  revenue: z.record(z.string(), speechFragmentSchema),
  /** Tax cuts and reversals: {measures}. */
  giveaways: speechFragmentSchema,
  /** Said once if a promise made in Downing Street is broken: {promises}. */
  lockBreak: speechFragmentSchema,
  /** Said if anything was scaled back since the forecast: {count}, {saving}. */
  compromises: speechFragmentSchema,
  /** Said per delayed measure: {title}, {year}. */
  delay: speechFragmentSchema,
  /**
   * The closing flourish, by add-on id, `further` (one notch more on a priority: {title}),
   * `several` (more than one add-on: {titles}) or `keep`: {headroom}.
   */
  rabbit: z.record(z.string(), speechFragmentSchema),
  /** The last word, keyed `met`, `missed` or `breach`: {headroom}, {targetYear}. */
  peroration: z.record(z.string(), speechFragmentSchema),
});

/* --------------------------------------------------------------- the close */

/**
 * Who a lever falls on (stage 7's "who paid, who benefited"). Every non-macro lever carries one
 * group tag; a tax group is a payer, a spending group a beneficiary. Tags are words, so the close
 * can total the engine's figures by them without adding a number of its own.
 */
export const incidenceGroupSchema = z.strictObject({
  label: z.string().min(1),
  side: z.enum(['pays', 'benefits']),
});

export const incidenceFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    groups: z.record(slug, incidenceGroupSchema),
    levers: z.record(z.string(), slug),
  })
  .superRefine((file, ctx) => {
    for (const [code, group] of Object.entries(file.levers)) {
      if (!file.groups[group])
        ctx.addIssue({
          code: 'custom',
          message: `lever ${code} is tagged with unknown group ${group}`,
          path: ['levers', code],
        });
    }
  });

/**
 * A kind of Budget the close can name. Every condition present must hold; kinds are read in
 * order and the first that fits is the verdict. The text is a game judgement; `{priority}` and
 * `{headroom}` are filled from data and the engine.
 */
export const verdictKindSchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(120),
  line: simulatedLineSchema,
  when: z.strictObject({
    rulesMet: z.boolean().optional(),
    breachAccepted: z.boolean().optional(),
    promisesAllKept: z.boolean().optional(),
    prioritiesAllFunded: z.boolean().optional(),
    prioritiesNoneFunded: z.boolean().optional(),
    headroomAtLeastTarget: z.boolean().optional(),
    headroomThin: z.boolean().optional(),
    rabbitKept: z.boolean().optional(),
    certified: z.boolean().optional(),
    restive: z.boolean().optional(),
  }),
});

export const verdictsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    kinds: z.array(verdictKindSchema).min(2),
    /** The kind used when none fits; must be one of the kinds. */
    fallback: slug,
  })
  .superRefine((file, ctx) => {
    if (!file.kinds.some((k) => k.id === file.fallback))
      ctx.addIssue({ code: 'custom', message: 'fallback names no kind', path: ['fallback'] });
  });

/* ----------------------------------------------------------- the reception */

/**
 * How Budget day reads to three audiences (Phase 9): the backbenchers, the markets and the public.
 * Each audience rates the Budget one to five. A rule reads one engine figure, picks the first band
 * whose `upTo` the figure does not exceed, and adds the band's points; the rating is three plus the
 * points, clamped, then held under any fired band's `cap`. Every threshold, every point and every
 * sentence is authored here and badged simulated: the engine compares figures with authored
 * thresholds and picks authored sentences, and invents no number of its own (ADR-0013).
 */
export const receptionBandSchema = z.strictObject({
  id: slug,
  upTo: z.number().optional(),
  points: z.number().int().min(-3).max(3),
  /** A ceiling on the audience's rating while this band is in force: the public's manifesto floor. */
  cap: z.number().int().min(1).max(5).optional(),
  /** `{value}` is the reading, signed; `{abs}` its size. Titles from data; no number typed here. */
  text: z.string().min(1).max(260),
  sources: z.array(sourceRefSchema).default([]),
  badge: simulatedBadgeSchema,
});

export const receptionRuleSchema = z
  .strictObject({
    id: slug,
    measure: readingMeasureSchema,
    reading: z.strictObject({
      label: z.string().min(1),
      unit: z.enum(['GBPm', 'pp', 'ratio', 'count', 'status']),
    }),
    /** The published anchor the thresholds lean on, for the "why this rating" disclosure. */
    note: z.string().min(1),
    /**
     * What would have moved this rule up a band, with `{gap}` for the distance to the next better
     * band in the reading's own unit. The engine fills the gap; it invents no threshold.
     */
    nudge: z.string().min(1).max(160).optional(),
    bands: z.array(receptionBandSchema).min(2),
  })
  .superRefine((rule, ctx) => {
    const last = rule.bands[rule.bands.length - 1];
    if (last?.upTo !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'the last band must have no upTo so every reading lands somewhere',
        path: ['bands'],
      });
    }
    let previous = -Infinity;
    rule.bands.forEach((band, i) => {
      if (band.upTo === undefined) return;
      if (band.upTo <= previous) {
        ctx.addIssue({
          code: 'custom',
          message: 'band thresholds must increase',
          path: ['bands', i],
        });
      }
      previous = band.upTo;
    });
  });

export const receptionAudienceIdSchema = z.enum(['backbenchers', 'markets', 'public']);

export const receptionAudienceSchema = z.strictObject({
  id: receptionAudienceIdSchema,
  title: z.string().min(1),
  /** The question this audience is asking of the Budget. */
  question: z.string().min(1).max(120),
  /** The five labels, worst first. */
  labels: z.array(z.string().min(1)).length(5),
  rules: z.array(receptionRuleSchema).min(1),
});

export const receptionFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** The line above the three cards. */
    intro: z.string().min(1),
    audiences: z.array(receptionAudienceSchema).length(3),
  })
  .superRefine((file, ctx) => {
    const ids = new Set(file.audiences.map((a) => a.id));
    for (const id of receptionAudienceIdSchema.options) {
      if (!ids.has(id))
        ctx.addIssue({ code: 'custom', message: `no ${id} audience`, path: ['audiences'] });
    }
    const rules = new Set<string>();
    file.audiences.forEach((a, i) =>
      a.rules.forEach((r, j) => {
        if (rules.has(r.id))
          ctx.addIssue({
            code: 'custom',
            message: `duplicate rule ${r.id}`,
            path: ['audiences', i, 'rules', j],
          });
        rules.add(r.id);
      }),
    );
  });
