import { z } from 'zod';
import { readingMeasureSchema } from './journey.schema.js';
import { badgeSchema, sourceRefSchema } from './provenance.schema.js';

/**
 * The game layer (ADR-0011, ADR-0012). Everything in these files is a judgement nobody published,
 * so every item carries `badge: 'simulated'` as a literal: no text can pretend to be a costing.
 * Numbers are never authored here: where a line needs a figure the engine derives it and fills it
 * in.
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
  /**
   * Where the priority's spending reaches, when that is not the whole UK (Phase 25): "Health and
   * care budgets here are England's…", said once on its flagship screen. Words about scope, sourced
   * to the Statement of Funding Policy; commentary, never a number.
   */
  reach: z
    .strictObject({
      text: z.string().min(1).max(220),
      badge: z.literal('commentary'),
      sources: z.array(sourceRefSchema).min(1),
    })
    .optional(),
  /** The PM's case for it, in the PM's voice. */
  pitch: simulatedLineSchema,
  /** What the PM says when it is ranked. */
  reaction: simulatedLineSchema,
  /** The role that leads on delivering it: an adviser's or a minister's, as the data names them. */
  lead: z.string().min(1),
  /** Where the commitment comes from. */
  sources: z.array(sourceRefSchema).min(1),
});

/**
 * A promise the government made. `breaks` is a detector: the promise is broken when any listed
 * lever is on the wrong side of its default (or on at all, for a toggle). The promises are fixed:
 * there is no negotiating them away (Phase 9), only crossing them and being judged for it.
 */
/** A lever and the side of its default that crosses the promise: on (a toggle), above or below. */
const promiseRuleSchema = z.strictObject({
  code: z.string().min(1),
  when: z.enum(['above', 'below', 'on']),
});

/**
 * Where a promise comes from (Phase 25). Only the 2024 manifesto's own words are red lines the
 * public holds the government to on every doorstep; a Budget 2025 decision reversed is a U-turn,
 * and the fiscal rules are the Chancellor's own word, judged by the rules themselves.
 */
export const promiseOriginSchema = z.enum(['manifesto-2024', 'budget-2025', 'government']);

export const promiseSchema = z.strictObject({
  id: slug,
  title: z.string().min(1),
  /**
   * The promise in running words (Phase 25), for the sentences that name it: "I accepted breaking
   * the tax lock", "Because of the promise on the two-child limit". Its title is a statement of
   * the promise ("The two-child limit stays abolished"), which reads the wrong way in those places.
   */
  noun: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[^A-Z]/, 'a noun follows "breaking" or "Because of", so it starts in lower case'),
  /** Its short name on a lever's resting tag (Phase 25): "Tax lock: no rise". */
  tag: z.string().min(1).max(24),
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
  origin: promiseOriginSchema,
  /**
   * How the promise is judged: by the levers its lists name, or, for the fiscal rules, by the
   * verdicts (a rule missed breaks it). A promise judged by the rules names no lever.
   */
  judgedBy: z.enum(['levers', 'fiscalRules']).default('levers'),
  breaks: z.array(promiseRuleSchema),
  /**
   * The cases that keep the promise's words and test its spirit (Phase 23): the same detector,
   * amber rather than red, each with a line saying why. A lever named here is not in `breaks`.
   * A strain with `scored: false` is shown, amber, and scored by no audience, because another
   * rule already counts what it is about (Phase 25: a health cut, counted as a service cut).
   */
  strains: z
    .array(
      promiseRuleSchema.extend({
        text: z.string().min(1).max(160).optional(),
        scored: z.boolean().default(true),
      }),
    )
    .default([]),
});

/**
 * The Prime Minister at sign-off (Phase 25): one line on the review, chosen by first match: a rule
 * missed, a promise broken when the rules would hold without it, a promise broken, a promise
 * strained; nothing when all is well. In the PM's voice and badged as a judgement: twenty words or
 * fewer and no figure. `{rules}` is filled with the rules' plain names, `{promises}` with the
 * promises' nouns.
 */
export const signOffSchema = z
  .strictObject({
    rulesMissed: simulatedLineSchema,
    brokenWithRoom: simulatedLineSchema,
    broken: simulatedLineSchema,
    strained: simulatedLineSchema,
  })
  .superRefine((lines, ctx) => {
    for (const [key, line] of Object.entries(lines)) {
      if (/\d/.test(line.text))
        ctx.addIssue({
          code: 'custom',
          message: 'the Prime Minister signs off with no figure',
          path: [key, 'text'],
        });
      if (line.text.split(/\s+/).filter(Boolean).length > 20)
        ctx.addIssue({
          code: 'custom',
          message: 'a sign-off line is twenty words or fewer',
          path: [key, 'text'],
        });
    }
  });

export const pmFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** What this Budget could be for; the Chancellor ranks up to three. */
    priorities: z.array(prioritySchema).min(6).max(10),
    promises: z.array(promiseSchema).min(1),
    signOff: signOffSchema,
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
    file.promises.forEach((p, i) => {
      const watched = p.breaks.length + p.strains.length;
      if (p.judgedBy === 'fiscalRules' && watched > 0)
        ctx.addIssue({
          code: 'custom',
          message: `promise ${p.id} is judged by the fiscal rules and names no lever`,
          path: ['promises', i],
        });
      if (p.judgedBy === 'levers' && watched === 0)
        ctx.addIssue({
          code: 'custom',
          message: `promise ${p.id} is judged by levers but names none`,
          path: ['promises', i],
        });
      const broken = new Set(p.breaks.map((r) => r.code));
      p.strains.forEach((r, j) => {
        if (broken.has(r.code))
          ctx.addIssue({
            code: 'custom',
            message: `promise ${p.id} both breaks and strains on ${r.code}; pick one`,
            path: ['promises', i, 'strains', j, 'code'],
          });
      });
    });
  });

/* ------------------------------------------------------------ the options */

/**
 * A bundle of lever settings an adviser can propose (Phase 18, ADR-0022): one or two levers and
 * the values that deliver it. Cost, yield, badge, earliest start and red lines are all read from
 * the levers and the engine on the page; nothing here carries a number. No two options anywhere
 * share a lever, so whether an option is on, adjusted or off follows from the lever values and no
 * screen can light or undo another's choice (revised 2026-09-26).
 */
export const optionBundleSchema = z
  .record(z.string().min(1), z.number())
  .refine((v) => Object.keys(v).length >= 1 && Object.keys(v).length <= 2, {
    message: 'an option moves one or two levers',
  });

/**
 * Two options that count the same money. Authored once, on either of the pair, and read from
 * both sides: while one is in the Budget the other is offered "instead of" it, never as well.
 */
export const optionConflictSchema = z.strictObject({
  /** The other option's id, on any screen. */
  with: slug,
  /** Why the two cannot both be counted, in the proposer's words. */
  text: z.string().min(1).max(200),
});

/**
 * One adviser's line on an option (Phase 23): who proposed it and one plain judgement of its cost
 * and effect, in at most twelve words, in the voice of the screen's adviser (an id in
 * advisers.json who speaks on that screen). A size word ("big", "small") is tested against the
 * engine's own figure for the option, no figure is typed, and the sources are the option's.
 */
export const optionAdviceSchema = simulatedLineSchema.extend({
  adviser: slug,
  sources: z.array(sourceRefSchema).min(1),
});

/**
 * Whether an option delivers its priority in full or makes a start on it (Phase 25): a judgement
 * in one line, with its source, badged as one. A priority with only starts in the Budget reads
 * "started", not "delivered", on the bar, on the review and on Budget day, and the scoring counts
 * only what is delivered in full.
 */
export const optionScaleSchema = z.strictObject({
  kind: z.enum(['full', 'start']),
  why: z.string().min(1).max(140),
  sources: z.array(sourceRefSchema).min(1),
  badge: simulatedBadgeSchema,
});

/** A way to deliver a priority, proposed by the minister or adviser who leads on it. */
export const deliverOptionSchema = z.strictObject({
  id: slug,
  /** The priority this delivers (an id in pm.json's priorities). */
  priority: slug,
  /** What it does, plainly: "More money for prisons and courts". */
  title: z.string().min(1).max(80),
  /** What choosing it buys and does not buy, in the proposer's voice. Sourced. */
  line: simulatedLineSchema,
  advice: optionAdviceSchema,
  values: optionBundleSchema,
  scale: optionScaleSchema,
  conflicts: z.array(optionConflictSchema).min(1).optional(),
  /**
   * On the advisers' shortlist (Phase 27, ADR-0028): one of the one or two best ways to deliver
   * the priority, the ones basic mode shows. A judgement, badged as one on the screen; the
   * validator holds the picks to its rules and the tests hold them to £1bn.
   */
  shortlist: z.literal(true).optional(),
});

/**
 * The Chief Secretary's line when a step-4 trim settles a flagship's ask lower than chosen (Phase
 * 25): `{minister}` is the lever's own minister. It names no figure; the bar and the card do that.
 */
export const settledLineSchema = simulatedLineSchema.extend({
  role: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
});

export const optionsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    settled: settledLineSchema,
    deliver: z.array(deliverOptionSchema).min(1),
  })
  .superRefine((file, ctx) => {
    // Every priority can be delivered in full: a screen of starts only would leave it unreachable.
    const full = new Set(
      file.deliver.filter((o) => o.scale.kind === 'full').map((o) => o.priority),
    );
    const priorities = new Set(file.deliver.map((o) => o.priority));
    for (const priority of priorities) {
      if (!full.has(priority))
        ctx.addIssue({
          code: 'custom',
          message: `priority ${priority} has no way to deliver it in full`,
          path: ['deliver'],
        });
    }
    // One list since Phase 24 (the ways to pay became step 4's levers and the add-ons went), kept
    // in this shape so the checks read the same whichever lists the file carries.
    const lists = [['deliver', file.deliver]] as const;
    const ids = new Set<string>();
    for (const [screen, list] of lists) {
      list.forEach((o, i) => {
        if (ids.has(o.id))
          ctx.addIssue({ code: 'custom', message: `duplicate option ${o.id}`, path: [screen, i] });
        ids.add(o.id);
      });
    }
    // A title names one option: two cards reading the same would be one choice made twice.
    const titles = new Set<string>();
    for (const [screen, list] of lists) {
      list.forEach((o, i) => {
        if (titles.has(o.title))
          ctx.addIssue({
            code: 'custom',
            message: `two options are titled "${o.title}"`,
            path: [screen, i, 'title'],
          });
        titles.add(o.title);
      });
    }
    // No lever twice anywhere: two options on one lever would light or undo each other.
    const seen = new Map<string, { screen: string; id: string }>();
    for (const [screen, list] of lists) {
      list.forEach((o, i) => {
        for (const code of Object.keys(o.values)) {
          const other = seen.get(code);
          if (other)
            ctx.addIssue({
              code: 'custom',
              message: `${other.screen} option ${other.id} and ${screen} option ${o.id} both move lever ${code}`,
              path: [screen, i, 'values', code],
            });
          seen.set(code, { screen, id: o.id });
        }
      });
    }
    // A conflict names another option, and each pair is authored once.
    const pairs = new Set<string>();
    for (const [screen, list] of lists) {
      list.forEach((o, i) => {
        (o.conflicts ?? []).forEach((c, j) => {
          const path = [screen, i, 'conflicts', j, 'with'];
          if (c.with === o.id) {
            ctx.addIssue({ code: 'custom', message: `option ${o.id} conflicts with itself`, path });
          } else if (!ids.has(c.with)) {
            ctx.addIssue({
              code: 'custom',
              message: `option ${o.id} conflicts with unknown option ${c.with}`,
              path,
            });
          }
          const key = [o.id, c.with].sort().join('|');
          if (pairs.has(key))
            ctx.addIssue({
              code: 'custom',
              message: `options ${o.id} and ${c.with} both author their conflict; author it on one`,
              path,
            });
          pairs.add(key);
        });
      });
    }
  });

/* --------------------------------------------------------- fine-tuning */

/**
 * One policy on the fine-tuning screens (Phase 26, ADR-0027): a way to move a lever, under a plain
 * title that says what it does ("Put up VAT"), with the sizes it comes in and one line from the
 * screen's adviser. `sizes` are settings of the lever, smallest first and all on one side of where
 * it rests: one is a tick (a toggle switched on, or a single setting), two are Small and Large,
 * three are Small, Medium and Large. By default they are the usual step, twice it and five times
 * it, capped at the lever's range; where HMRC publishes points, they sit on those. The line is
 * tested at every size (a size word must hold for all of them, words.test.ts); no figure is typed,
 * and it cites what it rests on.
 */
export const finetunePolicySchema = z.strictObject({
  title: z.string().min(1).max(80),
  sizes: z.array(z.number()).min(1).max(3),
  advice: simulatedLineSchema.extend({ sources: z.array(sourceRefSchema).min(1) }),
});

/**
 * One lever on the fine-tuning screens (Phase 24, ADR-0025; policies since Phase 26): the policies
 * it offers, the usual direction first, and the other way (if the lever moves both ways) second.
 * Choosing one clears the other, since both set the same lever. `name` is the lever itself, plainly,
 * for the review and the notes ("The main rate of VAT"); a toggle's is its policy's title. `label`
 * is what it goes by inside its decision (ADR-0037), a short name in the decision's own terms:
 * "Food" under "Remove an exemption", "Basic rate" under "Change the rates". Without one it goes by
 * its plain name.
 */
export const finetuneItemSchema = z.strictObject({
  /** The lever's code: a live tax lever on the tax side, a spending or welfare one on the other. */
  code: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(48).optional(),
  policies: z.array(finetunePolicySchema).min(1).max(2),
});

/**
 * Ticks in one decision that contradict each other (ADR-0036): the 1% and the 2% wealth tax. The
 * screen draws them as one choice, radios under this name with where the tax is planned to be
 * among them, so only one can ever be in the Budget. Its levers sit side by side in the decision;
 * the validator holds them to being ticks that exclude each other and nothing else.
 */
export const finetuneAlternativesSchema = z.strictObject({
  name: z.string().min(1).max(60),
  codes: z.array(z.string().min(1)).min(2).max(4),
});

/**
 * One decision on either screen (ADR-0035; spending too since ADR-0037): a question a Chancellor
 * answers ("Change the headline rate", "Remove an exemption", "Change working-age benefits"),
 * holding the levers that answer it, in the order they are weighed. Its title is at most six words;
 * at most eight levers keep an open decision to about a screenful (seven until "1% on everything
 * now zero-rated" joined the exemptions it contradicts, ADR-0036). Ticks in it that contradict each
 * other are its `alternatives`, one choice each.
 */
export const finetuneDecisionSchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(48),
  alternatives: z.array(finetuneAlternativesSchema).optional(),
  items: z.array(finetuneItemSchema).min(1).max(8),
});

/**
 * One section of a screen, with the decisions about it: a tax on the tax screen ("Income tax",
 * "VAT", ADR-0035), what the money is for on the spending screen ("Public services", "Benefits",
 * ADR-0037). A tax's label is the lever family of every lever in it, so the family is the one
 * record of which tax a lever is; the validator holds each tax to its section.
 */
export const finetuneSectionSchema = z.strictObject({
  id: slug,
  label: z.string().min(1).max(60),
  decisions: z.array(finetuneDecisionSchema).min(1),
});

/**
 * A line under a screen's lead (Phase 25): what the lead's hundred and twenty characters cannot
 * hold, such as how long the spending settlements run. Each wears its own badge and sources.
 */
export const finetuneNoteSchema = z.strictObject({
  text: z.string().min(1).max(160),
  badge: badgeSchema,
  sources: z.array(sourceRefSchema).min(1),
});

/** One of the two screens: its heading, its one line, whose voice speaks on it, and its sections. */
export const finetuneSideSchema = z.strictObject({
  title: z.string().min(1).max(40),
  lead: z.string().min(1).max(120),
  notes: z.array(finetuneNoteSchema).default([]),
  /** The adviser who speaks every line on the screen (an id in advisers.json, on `finetune`). */
  adviser: slug,
  groups: z.array(finetuneSectionSchema).min(1),
});

export const finetuneFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    tax: finetuneSideSchema,
    spending: finetuneSideSchema,
  })
  .superRefine((file, ctx) => {
    // A lever appears once in the file, a section's id and name once on its screen, a decision's
    // id once in the file, and a name once in its decision: two cards for one lever would move
    // together and read as two choices, two sections under one name would split what they are
    // about, a decision's id names its panel on the page, and two choices under one name in a
    // decision would read as one.
    const codes = new Set<string>();
    const offer = (code: string, path: (string | number)[]) => {
      if (codes.has(code))
        ctx.addIssue({ code: 'custom', message: `lever ${code} is offered twice`, path });
      codes.add(code);
    };
    const decisions = new Set<string>();
    for (const side of ['tax', 'spending'] as const) {
      const ids = new Set<string>();
      const labels = new Set<string>();
      file[side].groups.forEach((g, i) => {
        if (ids.has(g.id))
          ctx.addIssue({
            code: 'custom',
            message: `two ${side} groups are called ${g.id}`,
            path: [side, 'groups', i, 'id'],
          });
        ids.add(g.id);
        if (labels.has(g.label))
          ctx.addIssue({
            code: 'custom',
            message: `two ${side} sections are called ${g.label}`,
            path: [side, 'groups', i, 'label'],
          });
        labels.add(g.label);
        g.decisions.forEach((d, j) => {
          const at = [side, 'groups', i, 'decisions', j];
          if (decisions.has(d.id))
            ctx.addIssue({
              code: 'custom',
              message: `two decisions are called ${d.id}`,
              path: [...at, 'id'],
            });
          decisions.add(d.id);
          const names = new Set<string>();
          d.items.forEach((item, k) => {
            offer(item.code, [...at, 'items', k, 'code']);
            const name = item.label ?? item.name ?? item.policies[0]?.title ?? item.code;
            if (names.has(name))
              ctx.addIssue({
                code: 'custom',
                message: `two choices in decision ${d.id} are called “${name}”`,
                path: [...at, 'items', k],
              });
            names.add(name);
          });
          // A set of alternatives is drawn where its first lever sits, so its levers are in this
          // decision, side by side and in its order, and each is in one set at most (ADR-0036).
          const order = d.items.map((item) => item.code);
          const alternated = new Set<string>();
          (d.alternatives ?? []).forEach((alt, a) => {
            const path = [...at, 'alternatives', a, 'codes'];
            for (const code of alt.codes) {
              if (!order.includes(code))
                ctx.addIssue({
                  code: 'custom',
                  message: `the alternatives “${alt.name}” name ${code}, which is not in decision ${d.id}`,
                  path,
                });
              if (alternated.has(code))
                ctx.addIssue({
                  code: 'custom',
                  message: `${code} is in two sets of alternatives`,
                  path,
                });
              alternated.add(code);
            }
            const place = alt.codes.map((code) => order.indexOf(code));
            if (
              !place.includes(-1) &&
              place.some((x, k) => k > 0 && x !== (place[k - 1] ?? -2) + 1)
            )
              ctx.addIssue({
                code: 'custom',
                message: `the alternatives “${alt.name}” are not side by side, in decision ${d.id}’s order`,
                path,
              });
          });
        });
      });
    }
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
 * When the review says a priority is short of delivery (Review.tsx): nothing funds it yet, or only a
 * start does. A closed list, not a language: a new one needs code. The advisers no longer speak above
 * the fine-tuning cards (ADR-0040).
 */
export const interventionWhenSchema = z.enum(['priority-unfunded', 'priority-part-funded']);

/**
 * An adviser's line on a priority short of delivery, which the review shows under it. `{name}` in
 * the text is filled with the priority's title: a title from data, never a number. The line's own
 * sources are for any fact it states beyond that.
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
  /**
   * The incidence groups whose levers reach this household at all (Phase 25): its pay, its shop,
   * its benefits, the services it uses. The untouched line is said only when nothing in these
   * groups moved; otherwise, with no touch of its own fired, the file's `unnamed` line is.
   */
  exposure: z.array(slug).min(1),
  /** Said only when nothing in the household's groups moved, so it can never be wrong. */
  untouched: simulatedLineSchema,
  /** Whether they could tell what the Budget was for: a theme delivered, or not. */
  understood: simulatedLineSchema,
  puzzled: simulatedLineSchema,
});

export const householdsFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    households: z.array(householdSchema).min(3),
    /**
     * What a household says when something in its groups moved but nothing aimed at it by name
     * (Phase 25): a line that claims nothing specific, so a tax rise on everyone is never "untouched".
     */
    unnamed: simulatedLineSchema,
    /**
     * Levers that reach none of the households by name (Phase 25): a bank levy, a wealth tax
     * above £10 million, defence. Every curated and flagship lever touches a household or is here.
     */
    reachesNone: z.array(z.string().min(1)).default([]),
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
    const touched = new Set(file.households.flatMap((h) => h.touches.map((t) => t.code)));
    file.reachesNone.forEach((code, i) => {
      if (touched.has(code))
        ctx.addIssue({
          code: 'custom',
          message: `${code} reaches none of the households, yet one is touched by it`,
          path: ['reachesNone', i],
        });
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

/**
 * The Leader of the Opposition's reply (Phase 25): one line, chosen by the Budget's biggest
 * weakness, in a voice from the other side of the House. A judgement in a role's voice, badged as
 * one, with no figure in it.
 */
export const oppositionReplySchema = z
  .strictObject({
    rulesMissed: speechFragmentSchema,
    promiseBroken: speechFragmentSchema,
    taxUp: speechFragmentSchema,
    borrowingUp: speechFragmentSchema,
    cuts: speechFragmentSchema,
    default: speechFragmentSchema,
  })
  .superRefine((reply, ctx) => {
    for (const [key, line] of Object.entries(reply)) {
      if (/\d/.test(line.text))
        ctx.addIssue({
          code: 'custom',
          message: 'the Opposition makes no figure of its own',
          path: [key, 'text'],
        });
    }
  });

export const speechFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  /**
   * Keyed by the first priority delivered in full (Phase 25), plus `default` when none is:
   * {priorities}, {targetYear}.
   */
  opening: z.record(z.string(), speechFragmentSchema),
  /** When no priority is delivered in full but one has a start: {priority}. */
  openingStarted: speechFragmentSchema,
  /**
   * The forecast before any measure, and what the Budget does to borrowing, all worked out
   * (Phase 25): {startYear}, {borrowingThen}, {targetYear}, {borrowingTarget}, and one of the
   * `change` lines: {change}.
   */
  forecast: speechFragmentSchema,
  forecastChange: z.strictObject({
    up: speechFragmentSchema,
    down: speechFragmentSchema,
    same: speechFragmentSchema,
  }),
  /** One paragraph per priority delivered: {title}, {options}, {price}, {targetYear}. */
  priority: speechFragmentSchema,
  /** Spending measures that are not flagships: {measures}. */
  spending: speechFragmentSchema,
  /** Departments' budgets cut: {measures}. */
  cuts: speechFragmentSchema,
  /** Benefits cut or reformed to save money (Phase 25): {measures}. */
  welfareCuts: speechFragmentSchema,
  /** Revenue paragraphs by who pays: {measures}, {yield}. */
  revenue: z.record(z.string(), speechFragmentSchema),
  /** Tax cuts and reversals: {measures}. */
  giveaways: speechFragmentSchema,
  /** Said once if a promise made in Downing Street is broken: {promises}. */
  lockBreak: speechFragmentSchema,
  /**
   * The last word, keyed `met` or `missed`: {headroom}, {targetYear} when met; {missed}, each
   * missed rule by its plain name and its own margin, when missed (Phase 25).
   */
  peroration: z.record(z.string(), speechFragmentSchema),
  opposition: oppositionReplySchema,
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
  /**
   * How a household feels a tax on this group, in the words that follow "felt" (Phase 25): "in pay
   * packets and prices", "through pay and prices". Words only, no figure; every paying group has
   * one.
   */
  felt: z.string().min(1).max(60).optional(),
});

export const incidenceFileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    groups: z.record(slug, incidenceGroupSchema),
    levers: z.record(z.string(), slug),
    /**
     * Taxes most households do not feel (Phase 25): levies on banks, on energy producers and on
     * the very top. They leave the public's count of tax rises, and earn no point either way.
     */
    notFelt: z.array(z.string().min(1)).default([]),
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
    for (const [id, group] of Object.entries(file.groups)) {
      if (group.side === 'pays' && !group.felt)
        ctx.addIssue({
          code: 'custom',
          message: `paying group ${id} says nothing of how it is felt`,
          path: ['groups', id],
        });
    }
    file.notFelt.forEach((code, i) => {
      const group = file.levers[code];
      if (!group || file.groups[group]?.side !== 'pays')
        ctx.addIssue({
          code: 'custom',
          message: `${code} is not felt, but pays nothing on the incidence tags`,
          path: ['notFelt', i],
        });
    });
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
/**
 * The same band in other words when a second reading says so (Phase 25): what the doubted yield
 * rests on, relief costs or others' figures. The first variant whose condition holds is read; the
 * points, cap and threshold are the band's own, so a variant changes the words and nothing else.
 */
export const receptionVariantSchema = z
  .strictObject({
    when: z.strictObject({
      measure: readingMeasureSchema,
      above: z.number().optional(),
      below: z.number().optional(),
    }),
    text: z.string().min(1).max(260),
    sources: z.array(sourceRefSchema).default([]),
  })
  .refine((v) => v.when.above !== undefined || v.when.below !== undefined, {
    message: 'a variant says when: above or below a reading',
  });

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
  variants: z.array(receptionVariantSchema).optional(),
  /**
   * The band also applies when a second reading passes a threshold, if the band lies further
   * along the rule than the one the reading itself lands in (Phase 25): cuts to health and
   * schools count from a lower threshold inside the public's rule on service cuts. The points,
   * cap and words are the band's own; only which band applies changes.
   */
  alsoWhen: z.strictObject({ measure: readingMeasureSchema, above: z.number() }).optional(),
});

export const receptionRuleSchema = z
  .strictObject({
    id: slug,
    /**
     * The rule in three words at most (Phase 25): how a card names it among the reasons on the
     * other side of its rating ("Counted against: Tax burden · Borrowing").
     */
    short: z
      .string()
      .min(1)
      .max(30)
      .refine((s) => s.trim().split(/\s+/).length <= 3, 'a short label is three words at most'),
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
