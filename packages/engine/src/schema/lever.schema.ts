import { z } from 'zod';
import {
  badgeSchema,
  fiscalYearSchema,
  isoDateSchema,
  sourceRefSchema,
} from './provenance.schema.js';

const yearValuesSchema = z.record(fiscalYearSchema, z.number());

/** Receipts heads in the vintage's receiptsByHeadPctGdp, plus nominal GDP itself. */
export const taxHeadSchema = z.enum([
  'incomeTax',
  'nics',
  'vat',
  'onshoreCorporationTax',
  'capitalTaxes',
  'businessRates',
  'fuelDuties',
  'alcoholAndTobaccoDuties',
  'otherTaxes',
  'nominalGdp',
]);

/** Spending lines in the vintage that a baseline can be taken from or a published figure can grow with. */
export const spendingHeadSchema = z.enum([
  'rdel',
  'cdel',
  'welfareTotal',
  'welfareInCap',
  'pensionerSpending',
  'universalCreditAndLegacy',
  'disabilityBenefits',
  'childBenefit',
  'otherWelfare',
]);

/** A receipts line in the vintage's receiptsByTax record, e.g. "receiptsByTax.inheritanceTax". */
export const receiptsByTaxHeadSchema = z
  .string()
  .regex(/^receiptsByTax\.[A-Za-z]+$/, 'receipts heads look like receiptsByTax.inheritanceTax');

/** Any vintage series a published figure can be carried forward with: a receipts head, nominal GDP, a spending line or a receipts-by-tax line. */
export const growthHeadSchema = z.union([
  taxHeadSchema,
  spendingHeadSchema,
  receiptsByTaxHeadSchema,
]);

/**
 * How to show the level a setting moves a rate or threshold to (display only; costings and
 * permalinks keep the change). `add`: level = baseline + value; `pctChange`: level = baseline × (1 + value ÷ 100).
 */
export const levelSchema = z.strictObject({
  baseline: z.number(),
  unit: z.enum(['pct', 'GBP', 'pence', 'GBPperWeek', 'GBPbn']),
  apply: z.enum(['add', 'pctChange']),
  label: z.string().min(1),
  decimals: z.number().int().min(0).max(2).optional(),
  source: sourceRefSchema,
  note: z.string().optional(),
});

export const controlSchema = z
  .strictObject({
    kind: z.enum(['slider', 'stepper', 'toggle', 'select']),
    /** p = pence in the pound; pp = percentage points; pct = per cent change; GBP = pounds a year. */
    unit: z.enum(['p', 'pp', 'pct', 'GBP', 'pctRealPerYear', 'GBPbn', 'bool', 'option']),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
    formatLabel: z.string().optional(),
    /** For `select`: the offered values (as strings) and their labels, e.g. { "-40": "Abolish (0%)", "0": "40%" }. */
    labels: z.record(z.string(), z.string()).optional(),
    level: levelSchema.optional(),
  })
  .superRefine((control, ctx) => {
    if (control.kind === 'select') {
      const keys = Object.keys(control.labels ?? {});
      if (keys.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'a select needs labels for its options',
          path: ['labels'],
        });
      }
      if (!keys.includes(String(control.default))) {
        ctx.addIssue({
          code: 'custom',
          message: 'a select must label its default value',
          path: ['labels'],
        });
      }
      for (const key of keys) {
        const v = Number(key);
        if (!Number.isFinite(v) || v < control.min || v > control.max) {
          ctx.addIssue({
            code: 'custom',
            message: `select option ${key} is outside [min, max]`,
            path: ['labels'],
          });
        }
      }
    }
    if (control.min >= control.max) {
      ctx.addIssue({ code: 'custom', message: 'min must be below max', path: ['min'] });
    }
    if (control.default < control.min || control.default > control.max) {
      ctx.addIssue({
        code: 'custom',
        message: 'default must lie within [min, max]',
        path: ['default'],
      });
    }
    if (
      control.kind === 'toggle' &&
      !(control.min === 0 && control.max === 1 && control.step === 1)
    ) {
      ctx.addIssue({ code: 'custom', message: 'toggles use min 0, max 1, step 1', path: ['kind'] });
    }
  });

/** Qualitative second-round effect: direction and words, never a number (ADR-0002). */
export const considerationSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum([
    'behavioural',
    'macro',
    'distributional',
    'administrative',
    'legal',
    'interaction',
    'market',
    'devolution',
  ]),
  direction: z.enum(['raisesLess', 'raisesMore', 'costsMore', 'costsLess', 'ambiguous']),
  magnitudeWords: z.enum(['small', 'moderate', 'large', 'unknown']).optional(),
  appliesWhen: z
    .strictObject({ above: z.number().optional(), below: z.number().optional() })
    .optional(),
  alreadyInDirectCosting: z.boolean(),
  text: z.string().min(1),
  sources: z.array(sourceRefSchema).min(1),
});

/** How ready-reckoner figures are carried to the game's years (ADR-0004). */
export const upratingRuleSchema = z.discriminatedUnion('method', [
  z.strictObject({
    method: z.literal('growWithSeries'),
    head: growthHeadSchema,
    note: z.string(),
  }),
  z.strictObject({ method: z.literal('flatCash'), note: z.string() }),
  z.strictObject({ method: z.literal('none') }),
]);

/** A published HMRC ready-reckoner row as cited by a lever. Values are as published (£m). */
export const hmrcRowRefSchema = z.strictObject({
  rowId: z.string().min(1),
  label: z.string().min(1),
  /** HMRC's sign: a "yield" row is positive when receipts rise; a "cost" row is positive when they fall. */
  hmrcSign: z.enum(['yield', 'cost']),
  /** Which table the row feeds for asymmetric levers. */
  role: z.enum(['increase', 'decrease']).default('increase'),
  values: yearValuesSchema,
});

export const rawSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('hmrcReadyReckoner'),
    sourceId: z.string().min(1),
    years: z.array(fiscalYearSchema).length(3),
    rows: z.array(hmrcRowRefSchema).min(1),
    combine: z.enum(['sum']).optional(),
    note: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal('hmtScorecard'),
    sourceId: z.string().min(1),
    lines: z
      .array(
        z.strictObject({
          number: z.number().int().positive(),
          title: z.string().min(1),
          values: yearValuesSchema,
        }),
      )
      .min(1),
    signConvention: z.literal('positiveReducesBorrowing'),
    note: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal('hmrcReliefCost'),
    sourceId: z.string().min(1),
    rows: z
      .array(
        z.strictObject({
          rowId: z.string().min(1),
          name: z.string().min(1),
          /** £ million cost of the relief as published, by fiscal year. */
          values: yearValuesSchema,
        }),
      )
      .min(1),
    note: z.string().optional(),
  }),
  /**
   * Arithmetic this repository does itself on published series, for policies nobody has costed
   * officially. The method names exactly what is computed so the validator can reproduce it; the
   * lever still carries the assumptions in words.
   */
  z.strictObject({
    kind: z.literal('derivedFromPublished'),
    method: z.discriminatedUnion('name', [
      /** (target share − the forecast share) × nominal GDP, e.g. defence at 5% of GDP. */
      z.strictObject({
        name: z.literal('gdpShareGap'),
        targetPctGdp: z.number().positive(),
        /** The share already in the forecast, per cent of GDP by year. */
        baselinePctGdp: yearValuesSchema,
      }),
      /**
       * A benefit line uprated by one published series instead of another: the saving is the line
       * times the cumulative ratio of the two uprating paths, compounding from the base year.
       */
      z.strictObject({
        name: z.literal('upratingGap'),
        /** The extract's row, e.g. DWP Table 1a "state-pension". */
        rowId: z.string().min(1),
        /** Last year on the current uprating path; the change starts the year after. */
        baseYear: fiscalYearSchema,
        currentSeries: z.enum(['tripleLockUprating', 'averageEarningsGrowth', 'cpiInflationFy']),
        replacementSeries: z.enum([
          'tripleLockUprating',
          'averageEarningsGrowth',
          'cpiInflationFy',
        ]),
      }),
      /**
       * Two or more published year series multiplied together, year by year: an outlay times the
       * share of it that scores somewhere, for instance. Every term carries its own source.
       */
      z.strictObject({
        name: z.literal('seriesProduct'),
        terms: z
          .array(
            z.strictObject({
              label: z.string().min(1),
              values: yearValuesSchema,
              unit: z.string().min(1),
              source: sourceRefSchema,
            }),
          )
          .min(2),
      }),
      /**
       * A product of published quantities, each with its own source, giving a first-year figure
       * that then moves with a forecast series (or stays flat in cash).
       */
      z.strictObject({
        name: z.literal('statedProduct'),
        terms: z
          .array(
            z.strictObject({
              label: z.string().min(1),
              value: z.number(),
              unit: z.string().min(1),
              source: sourceRefSchema,
            }),
          )
          .min(1),
        /** £ million in `baseYear`, equal to the product of the terms. */
        resultGbpm: z.number(),
        baseYear: fiscalYearSchema,
        /** Grow the result with this forecast series; omit to hold it flat in cash. */
        growWith: growthHeadSchema.optional(),
      }),
    ]),
    sourceId: z.string().min(1),
    /** Where the published inputs come from and what the arithmetic assumes. */
    note: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal('hmtSr25'),
    sourceId: z.string().min(1),
    /** Worksheet the rows come from, e.g. "Table 5.3 RDELex". */
    sheet: z.string().min(1),
    rows: z
      .array(
        z.strictObject({
          rowId: z.string().min(1),
          label: z.string().min(1),
          /** add = part of the baseline; subtract = taken out of it (the "all other" residual). */
          role: z.enum(['add', 'subtract']).default('add'),
          /** £ million by fiscal year as extracted (the published table is £ billion). */
          values: yearValuesSchema,
        }),
      )
      .min(1),
    note: z.string().optional(),
  }),
]);

export const costingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('linearPerUnit'),
    /** Size of one control unit in the lever's own terms (1 for a penny or a point; 104 for £2 a week). */
    unitDelta: z.number().positive(),
    /** Effect of one unit increase, engine sign (receipts positive = more revenue), keyed by ready-reckoner year. */
    perUnit: yearValuesSchema,
    basis: z.enum(['accruals', 'cash', 'liability']),
    symmetric: z.boolean(),
    /** Effect of one unit DEcrease, engine sign, for asymmetric levers. */
    decreasePerUnit: yearValuesSchema.optional(),
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('lookupTable'),
    input: z.enum(['p', 'pp', 'pct', 'GBP']),
    points: z
      .array(
        z.strictObject({
          input: z.number(),
          /** Engine sign, keyed by ready-reckoner year. */
          effect: yearValuesSchema,
          from: z
            .strictObject({
              rowIds: z.array(z.string().min(1)).min(1).optional(),
              /** A vintage series such as "receiptsByTax.inheritanceTax" (the whole tax line). */
              vintageSeries: receiptsByTaxHeadSchema.optional(),
              multiplier: z.number(),
            })
            .refine((f) => (f.rowIds ? 1 : 0) + (f.vintageSeries ? 1 : 0) === 1, {
              message: 'a lookup point cites either HMRC rows or one vintage series',
            })
            .optional(),
        }),
      )
      .min(2),
    interpolation: z.literal('linear'),
    extrapolation: z.literal('forbid'),
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    uprating: upratingRuleSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('schedule'),
    /** Engine sign by fiscal year; years before the implementation year are ignored at runtime. */
    effect: yearValuesSchema,
    /**
     * A single payment rather than a yearly one: the amount falls in the implementation year and
     * nothing after it. `effect` then carries exactly one entry, the amount.
     */
    once: z.boolean().optional(),
    source: sourceRefSchema,
    rawSource: rawSourceSchema.optional(),
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('pctOfBaseline'),
    /** The £ million path the percentage applies to from the implementation year. */
    baseline: z.discriminatedUnion('from', [
      z.strictObject({ from: z.literal('vintage'), series: spendingHeadSchema }),
      z.strictObject({
        from: z.literal('published'),
        years: z.array(fiscalYearSchema).min(1),
        /** £ million by published year (a spending plan is positive). */
        values: yearValuesSchema,
        /** Vintage series whose growth carries the last published year forward. */
        extendWith: growthHeadSchema,
        rawSource: rawSourceSchema,
      }),
    ]),
    source: sourceRefSchema,
    caveats: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('sensitivity'),
    sensitivityId: z.string().min(1),
  }),
]);

/**
 * A reference point shown beside a spending control: what this budget has done before, or what a
 * target would cost. Milestones with a `from` are recomputed by the validator from the cited
 * PESA table, so they cannot drift from the published statistics.
 */
export const milestoneSchema = z.strictObject({
  label: z.string().min(1),
  value: z.number(),
  unit: z.enum(['pctRealPerYear', 'pctGDP', 'GBPbn']),
  from: z
    .strictObject({
      pesaSheet: z.enum(['4_3', '4_4']),
      rowId: z.string().min(1),
      /** Required for a growth rate; omitted when reading a single year. */
      fromYear: fiscalYearSchema.optional(),
      toYear: fiscalYearSchema,
    })
    .optional(),
  source: sourceRefSchema,
  note: z.string().optional(),
});

export const classificationSchema = z.strictObject({
  side: z.enum(['receipts', 'spending']),
  currentOrCapital: z.enum(['current', 'capital']),
  taxHead: taxHeadSchema.optional(),
  delType: z.enum(['RDEL', 'CDEL']).optional(),
  department: z.string().optional(),
  insideWelfareCap: z.boolean().optional(),
  /**
   * The share of a spending change that is capital, where it splits. Omit for a change that is
   * wholly one or the other, which `currentOrCapital` already says.
   */
  capitalShare: z.number().min(0).max(1).optional(),
  psnflTreatment: z.enum(['standard', 'financialTransaction']).default('standard'),
  barnettConsequential: z.boolean().optional(),
});

export const leverSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    /** Short stable code used in permalinks. Never reused. */
    code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
    category: z.enum(['tax', 'spend', 'welfare', 'macro', 'campaign']),
    badge: badgeSchema,
    /** UI grouping within a category, e.g. "Income tax"; ordered by `order`. */
    group: z.string().min(1).optional(),
    order: z.number().int().optional(),
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    /** The one line shown on the card. Everything longer belongs in `description`. */
    headline: z.string().min(1).max(90).optional(),
    /** The full explanation, shown in the provenance drawer. */
    description: z.string().min(1),
    baselinePolicy: z.strictObject({
      text: z.string().min(1),
      value: z.number().optional(),
      unit: z.string().optional(),
      source: sourceRefSchema,
      alreadyIncludes: z.array(z.string()).optional(),
    }),
    control: controlSchema,
    earliestImplementation: fiscalYearSchema.optional(),
    appliesFrom: z.enum(['firstForecastYear', 'implementationYear']).optional(),
    classification: classificationSchema.optional(),
    costing: costingSchema,
    indexation: z
      .strictObject({
        baseline: z.enum(['CPI', 'RPI', 'frozen', 'earnings', 'tripleLock', 'none']),
        frozenUntil: fiscalYearSchema.optional(),
        note: z.string(),
      })
      .optional(),
    /** Reference points shown beside the control: history, targets, what a commitment costs. */
    milestones: z.array(milestoneSchema).optional(),
    considerations: z.array(considerationSchema),
    interactions: z
      .array(
        z.strictObject({
          withLever: z.string().min(1),
          text: z.string().min(1),
          severity: z.enum(['info', 'warn']),
        }),
      )
      .optional(),
    deprecated: z.boolean().optional(),
    status: z.enum(['draft', 'reviewed']),
    reviewedOn: isoDateSchema.optional(),
  })
  .superRefine((lever, ctx) => {
    if (lever.badge === 'simulated') {
      ctx.addIssue({
        code: 'custom',
        message: 'a lever is arithmetic; it cannot wear the simulated badge (ADR-0011)',
        path: ['badge'],
      });
    }
    if (
      lever.costing.kind === 'schedule' &&
      lever.costing.once === true &&
      Object.keys(lever.costing.effect).length !== 1
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'a one-off schedule carries exactly one amount, paid in the implementation year',
        path: ['costing', 'effect'],
      });
    }
    if (lever.category === 'macro') {
      if (lever.costing.kind !== 'sensitivity') {
        ctx.addIssue({
          code: 'custom',
          message: 'macro levers must use a sensitivity costing',
          path: ['costing', 'kind'],
        });
      }
      if (lever.badge !== 'assumption') {
        ctx.addIssue({
          code: 'custom',
          message: 'macro levers are assumptions and must carry the assumption badge',
          path: ['badge'],
        });
      }
    } else {
      if (lever.costing.kind === 'sensitivity') {
        ctx.addIssue({
          code: 'custom',
          message: 'only macro levers may use a sensitivity costing',
          path: ['costing', 'kind'],
        });
      }
      if (!lever.classification) {
        ctx.addIssue({
          code: 'custom',
          message: 'tax, spend and welfare levers need a classification',
          path: ['classification'],
        });
      }
      if (!lever.group) {
        ctx.addIssue({ code: 'custom', message: 'policy levers need a UI group', path: ['group'] });
      }
      if (!lever.headline) {
        ctx.addIssue({
          code: 'custom',
          message: 'policy levers need a headline: the one line shown on the card',
          path: ['headline'],
        });
      }
      if (
        lever.badge === 'direct' &&
        (lever.costing.kind === 'linearPerUnit' ||
          lever.costing.kind === 'lookupTable' ||
          lever.costing.kind === 'schedule') &&
        !lever.costing.rawSource
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'a direct costing must cite its published rows or lines in rawSource',
          path: ['costing', 'rawSource'],
        });
      }
    }
    if (lever.costing.kind === 'pctOfBaseline') {
      if (lever.control.unit !== 'pct') {
        ctx.addIssue({
          code: 'custom',
          message: 'a percentage-of-baseline lever is controlled in per cent',
          path: ['control', 'unit'],
        });
      }
      if (lever.badge !== 'mechanical') {
        ctx.addIssue({
          code: 'custom',
          message:
            'a percentage of a published baseline is mechanical arithmetic, not a direct costing',
          path: ['badge'],
        });
      }
      const baseline = lever.costing.baseline;
      if (baseline.from === 'published') {
        if (baseline.rawSource.kind !== 'hmtSr25') {
          ctx.addIssue({
            code: 'custom',
            message: 'a published baseline must cite Spending Review rows (hmtSr25)',
            path: ['costing', 'baseline', 'rawSource'],
          });
        }
        for (const y of baseline.years) {
          if (baseline.values[y] === undefined) {
            ctx.addIssue({
              code: 'custom',
              message: `published baseline has no value for ${y}`,
              path: ['costing', 'baseline', 'values'],
            });
          }
        }
      }
    }
    if (lever.classification?.insideWelfareCap) {
      if (
        lever.classification.side !== 'spending' ||
        lever.classification.currentOrCapital !== 'current'
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'only current spending can sit inside the welfare cap',
          path: ['classification', 'insideWelfareCap'],
        });
      }
    }
    if (lever.costing.kind === 'lookupTable') {
      const inputs = lever.costing.points.map((p) => p.input);
      const min = Math.min(...inputs);
      const max = Math.max(...inputs);
      if (lever.control.min < min || lever.control.max > max) {
        ctx.addIssue({
          code: 'custom',
          message: `control range [${lever.control.min}, ${lever.control.max}] must stay inside the published points [${min}, ${max}]`,
          path: ['control'],
        });
      }
      if (!inputs.includes(0)) {
        ctx.addIssue({
          code: 'custom',
          message: 'lookup tables need a point at 0',
          path: ['costing', 'points'],
        });
      }
      if (new Set(inputs).size !== inputs.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'lookup inputs must be distinct',
          path: ['costing', 'points'],
        });
      }
    }
    if (
      lever.costing.kind === 'linearPerUnit' &&
      !lever.costing.symmetric &&
      !lever.costing.decreasePerUnit &&
      lever.control.min < 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'an asymmetric lever that can decrease needs decreasePerUnit',
        path: ['costing', 'decreasePerUnit'],
      });
    }
    if (lever.status === 'reviewed' && !lever.reviewedOn) {
      ctx.addIssue({
        code: 'custom',
        message: 'reviewed levers need reviewedOn',
        path: ['reviewedOn'],
      });
    }
  });
