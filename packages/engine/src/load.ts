import type { ZodType } from 'zod';
import { DataError } from './errors.js';
import {
  advisersFileSchema,
  pmFileSchema,
  ministersFileSchema,
  householdsFileSchema,
  incidenceFileSchema,
  guideFileSchema,
  glossaryFileSchema,
  budgetFileSchema,
  balanceFileSchema,
  receptionFileSchema,
  contextFileSchema,
  hmrcExtractSchema,
  householdsReferenceSchema,
  leverSchema,
  dwpBenefitExtractSchema,
  pesaExtractSchema,
  reliefExtractSchema,
  ruleSetSchema,
  scorecardExtractSchema,
  sourcesFileSchema,
  sr25ExtractSchema,
  vintageSchema,
} from './schema/index.js';
import type {
  AdvisersFile,
  PmFile,
  MinistersFile,
  HouseholdsFile,
  IncidenceFile,
  GuideFile,
  GlossaryFile,
  BudgetFile,
  BalanceFile,
  ReceptionFile,
  ContextFile,
  HmrcExtract,
  HouseholdsReference,
  Lever,
  DwpBenefitExtract,
  PesaExtract,
  ReliefExtract,
  RuleSet,
  ScorecardExtract,
  SourcesFile,
  Sr25Extract,
  Vintage,
} from './types/data.js';
import { policyYearsOf } from './calc/arithmetic.js';
import { fyOfDate } from './calc/years.js';
import { hasHead } from './costing/taxHead.js';
import { GUIDED_STEPS, stageTerms } from './game/guide.js';
import { BUDGET_STORY_FILLS, cardMeasures, storyPlaceholders } from './game/budget.js';
import { validateVintage } from './validate/validateVintage.js';

function parseWith<T>(schema: ZodType<T>, json: unknown, label: string): T {
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`,
    );
    throw new DataError(`${label} failed schema validation`, issues);
  }
  return result.data;
}

export function parseVintage(json: unknown): Vintage {
  const vintage = parseWith(vintageSchema, json, 'vintage');
  const problems = validateVintage(vintage);
  if (problems.length > 0)
    throw new DataError(`vintage ${vintage.id} failed consistency checks`, problems);
  return vintage;
}

export function parseRules(json: unknown): RuleSet {
  return parseWith(ruleSetSchema, json, 'rules');
}

export function parseLever(json: unknown): Lever {
  return parseWith(leverSchema, json, 'lever');
}

export function parseSources(json: unknown): SourcesFile {
  const file = parseWith(sourcesFileSchema, json, 'sources');
  const ids = new Set<string>();
  const dupes: string[] = [];
  for (const s of file.sources) {
    if (ids.has(s.id)) dupes.push(`duplicate source id ${s.id}`);
    ids.add(s.id);
  }
  if (dupes.length > 0) throw new DataError('sources registry has duplicates', dupes);
  return file;
}

export function parseHouseholds(json: unknown): HouseholdsReference {
  return parseWith(householdsReferenceSchema, json, 'households reference');
}

export function parseHmrcExtract(json: unknown): HmrcExtract {
  return parseWith(hmrcExtractSchema, json, 'HMRC ready reckoner extract');
}

export function parseScorecardExtract(json: unknown): ScorecardExtract {
  return parseWith(scorecardExtractSchema, json, 'Budget 2025 scorecard extract');
}

export function parseSr25Extract(json: unknown): Sr25Extract {
  return parseWith(sr25ExtractSchema, json, 'Spending Review 2025 DEL tables extract');
}

export function parseReliefExtract(json: unknown): ReliefExtract {
  return parseWith(reliefExtractSchema, json, 'HMRC tax relief cost extract');
}

export function parsePesaExtract(json: unknown): PesaExtract {
  return parseWith(pesaExtractSchema, json, 'PESA expenditure by function extract');
}

export function parseDwpBenefitExtract(json: unknown): DwpBenefitExtract {
  return parseWith(dwpBenefitExtractSchema, json, 'DWP benefit expenditure extract');
}

export function parseContext(json: unknown): ContextFile {
  return parseWith(contextFileSchema, json, 'context file');
}

export function parseAdvisers(json: unknown): AdvisersFile {
  return parseWith(advisersFileSchema, json, 'advisers');
}

export function parseReception(json: unknown): ReceptionFile {
  return parseWith(receptionFileSchema, json, 'the reception');
}

export function parsePm(json: unknown): PmFile {
  return parseWith(pmFileSchema, json, 'the Prime Minister');
}

export function parseMinisters(json: unknown): MinistersFile {
  return parseWith(ministersFileSchema, json, 'the ministers');
}

export function parseHouseholdsFile(json: unknown): HouseholdsFile {
  return parseWith(householdsFileSchema, json, 'the households');
}

export function parseIncidence(json: unknown): IncidenceFile {
  return parseWith(incidenceFileSchema, json, 'incidence tags');
}

export function parseGuide(json: unknown): GuideFile {
  return parseWith(guideFileSchema, json, 'the guide');
}

export function parseGlossary(json: unknown): GlossaryFile {
  return parseWith(glossaryFileSchema, json, 'the glossary');
}

export function parseBudget(json: unknown): BudgetFile {
  return parseWith(budgetFileSchema, json, 'the Budget');
}

export function parseBalance(json: unknown): BalanceFile {
  return parseWith(balanceFileSchema, json, 'the balance page');
}

export interface Dataset {
  sources: SourcesFile;
  vintage: Vintage;
  rules: RuleSet;
  levers: Lever[];
  households?: HouseholdsReference;
  /** "What has changed since the forecast" files, newest last. */
  contexts?: ContextFile[];
  advisers?: AdvisersFile;
  pm?: PmFile;
  ministers?: MinistersFile;
  electorate?: HouseholdsFile;
  incidence?: IncidenceFile;
  guide?: GuideFile;
  glossary?: GlossaryFile;
  /** The Budget the game starts from (ADR-0045). */
  budget?: BudgetFile;
  /** The balance page's two menus (ADR-0046). */
  balance?: BalanceFile;
  reception?: ReceptionFile;
}

/**
 * Why a card cannot propose a setting: it is outside the control's range, it is where the lever
 * rests (so choosing it would change nothing), or it is off the control's steps (so the player
 * could never reach it).
 */
function settingProblem(lever: Lever, value: number): 'range' | 'default' | 'steps' | undefined {
  const { min, max, step } = lever.control;
  if (value < min || value > max) return 'range';
  if (value === lever.control.default) return 'default';
  if (step > 0 && Math.abs(Math.round((value - min) / step) * step + min - value) > 1e-9) {
    return 'steps';
  }
  return undefined;
}

function collectSourceIds(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectSourceIds(v, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'sourceId' && typeof v === 'string') out.add(v);
      else collectSourceIds(v, out);
    }
  }
}

/** Cross-file checks: every source reference resolves, lever codes are unique, and so on. */
export function validateDataset(ds: Dataset): string[] {
  const problems: string[] = [];
  const known = new Set(ds.sources.sources.map((s) => s.id));
  const referenced = new Set<string>();
  collectSourceIds(
    [
      ds.vintage,
      ds.rules,
      ds.levers,
      ds.households ?? null,
      ds.contexts ?? null,
      ds.pm ?? null,
      ds.ministers ?? null,
      ds.electorate ?? null,
      ds.incidence ?? null,
      ds.glossary ?? null,
      ds.budget ?? null,
      ds.reception ?? null,
    ],
    referenced,
  );
  for (const id of referenced) {
    if (!known.has(id)) problems.push(`source id "${id}" is referenced but not in the registry`);
  }
  const codes = new Set<string>();
  const ids = new Set<string>();
  for (const lever of ds.levers) {
    if (codes.has(lever.code)) problems.push(`duplicate lever code ${lever.code}`);
    if (ids.has(lever.id)) problems.push(`duplicate lever id ${lever.id}`);
    codes.add(lever.code);
    ids.add(lever.id);
    if (lever.classification?.taxHead && !hasHead(ds.vintage, lever.classification.taxHead)) {
      problems.push(
        `lever ${lever.id} cites tax head "${lever.classification.taxHead}" missing from vintage ${ds.vintage.id}`,
      );
    }
    if (lever.earliestStart) {
      const years = policyYearsOf(ds.vintage);
      if (!years.includes(lever.earliestStart.year)) {
        problems.push(
          `lever ${lever.id} cannot start in ${lever.earliestStart.year}: vintage ${ds.vintage.id} runs ${years[0] ?? '?'} to ${years[years.length - 1] ?? '?'}`,
        );
      }
    }
    if (
      (lever.costing.kind === 'linearPerUnit' || lever.costing.kind === 'lookupTable') &&
      lever.costing.uprating.method === 'growWithSeries' &&
      !hasHead(ds.vintage, lever.costing.uprating.head)
    ) {
      problems.push(
        `lever ${lever.id} uprates with head "${lever.costing.uprating.head}" missing from vintage ${ds.vintage.id}`,
      );
    }
    if (lever.costing.kind === 'lookupTable') {
      for (const point of lever.costing.points) {
        const series = point.from?.vintageSeries;
        if (series && !hasHead(ds.vintage, series)) {
          problems.push(
            `lever ${lever.id} lookup point ${point.input} cites series "${series}" missing from vintage ${ds.vintage.id}`,
          );
        }
      }
    }
    if (lever.costing.kind === 'pctOfBaseline') {
      const baseline = lever.costing.baseline;
      const head = baseline.from === 'vintage' ? baseline.series : baseline.extendWith;
      if (!hasHead(ds.vintage, head)) {
        problems.push(
          `lever ${lever.id} needs series "${head}" missing from vintage ${ds.vintage.id}`,
        );
      }
    }
    if (lever.costing.kind === 'sensitivity') {
      const id = lever.costing.sensitivityId;
      if (!ds.vintage.sensitivities.some((s) => s.id === id)) {
        problems.push(
          `lever ${lever.id} refers to sensitivity "${id}" missing from vintage ${ds.vintage.id}`,
        );
      }
    }
    for (const interaction of lever.interactions ?? []) {
      const other = ds.levers.find((l) => l.id === interaction.withLever);
      if (!other) {
        problems.push(`lever ${lever.id} interacts with unknown lever ${interaction.withLever}`);
        continue;
      }
      // Two measures that count the same money are one fact about the pair: authored once, so
      // the reason a card gives is never contradicted by its partner's.
      if (
        interaction.severity === 'excludes' &&
        (other.interactions ?? []).some((i) => i.withLever === lever.id)
      ) {
        problems.push(
          `levers ${lever.id} and ${other.id} both author their pair; an excludes pair is authored once`,
        );
      }
    }
  }
  const adviserById = new Map((ds.advisers?.advisers ?? []).map((a) => [a.id, a] as const));
  for (const context of ds.contexts ?? []) {
    if (adviserById.size > 0 && !adviserById.has(context.adviser)) {
      problems.push(`context ${context.id} names unknown adviser ${context.adviser}`);
    }
    if (context.vintageId !== ds.vintage.id) {
      problems.push(
        `context ${context.id} compares against vintage ${context.vintageId}, not ${ds.vintage.id}`,
      );
    }
    for (const reading of context.readings) {
      if (reading.leverCode && !codes.has(reading.leverCode)) {
        problems.push(
          `context ${context.id} reading ${reading.id} sets unknown lever code ${reading.leverCode}`,
        );
      }
      if (reading.leverCode && !reading.suggestion) {
        problems.push(
          `context ${context.id} reading ${reading.id} names a lever but has no suggestion rule`,
        );
      }
    }
    // What is already on the desk is dealt with by a lever the game has (Phase 25).
    for (const item of context.inTray) {
      if (!codes.has(item.leverCode)) {
        problems.push(
          `context ${context.id} in-tray ${item.id} names unknown lever ${item.leverCode}`,
        );
      }
    }
    // The briefing's two published figures (Phase 28, ADR-0030): each read from a quoted passage,
    // and the gilt sales for the year the context is dated in, since the page says "this year".
    if (context.briefing) {
      const { averageHeadroom, giltSales } = context.briefing;
      const figures = [
        ['average headroom', averageHeadroom.source],
        ['gilt sales', giltSales.source],
      ] as const;
      for (const [name, source] of figures) {
        if (!source.quote) {
          problems.push(`context ${context.id} briefing ${name} quotes nothing from its source`);
        }
      }
      const year = fyOfDate(context.asOf);
      if (giltSales.year !== year) {
        problems.push(
          `context ${context.id} briefing gilt sales are for ${giltSales.year}, not ${year}, the year it is dated in`,
        );
      }
    }
  }
  if (ds.pm) {
    // A promise that names a lever the game does not have would be a commitment the player
    // could never keep or break.
    for (const promise of ds.pm.promises) {
      for (const rule of [...promise.breaks, ...promise.strains]) {
        if (!codes.has(rule.code)) {
          problems.push(`promise ${promise.id} watches unknown lever "${rule.code}"`);
        }
      }
    }
  }
  if (ds.ministers) {
    // Every spending and welfare lever has someone to speak for it, and nobody speaks for a lever
    // the game does not have. A band that never applies is a line the player can never hear.
    const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
    const spoken = new Set(ds.ministers.ministers.map((m) => m.code));
    for (const lever of ds.levers) {
      if (lever.deprecated) continue;
      if ((lever.category === 'spend' || lever.category === 'welfare') && !spoken.has(lever.code)) {
        problems.push(`no minister speaks for ${lever.code}`);
      }
    }
    for (const minister of ds.ministers.ministers) {
      const lever = byCode.get(minister.code);
      if (!lever) {
        problems.push(`minister for "${minister.code}" speaks for a lever the game does not have`);
        continue;
      }
      if (lever.category === 'macro' || lever.category === 'tax') {
        problems.push(
          `minister for ${minister.code}: ministers speak for spending, not for ${lever.category}`,
        );
      }
      const base = lever.control.default;
      if (
        minister.whenCut.length > 0 &&
        !minister.whenCut.some((b) => (b.appliesWhen.below ?? -Infinity) >= base)
      ) {
        problems.push(
          `minister for ${minister.code}: no whenCut band applies to a cut of any size`,
        );
      }
      if (
        minister.whenRaised.length > 0 &&
        !minister.whenRaised.some((b) => (b.appliesWhen.above ?? Infinity) <= base)
      ) {
        problems.push(
          `minister for ${minister.code}: no whenRaised band applies to a rise of any size`,
        );
      }
      if (lever.control.min < base && minister.whenCut.length === 0) {
        problems.push(
          `minister for ${minister.code} has nothing to say at a cut the slider allows`,
        );
      }
      if (lever.control.max > base && minister.whenRaised.length === 0) {
        problems.push(
          `minister for ${minister.code} has nothing to say at a rise the slider allows`,
        );
      }
    }
  }
  if (ds.incidence) {
    // Every lever that moves money has someone it falls on; a tag for a lever that does not exist
    // is a typo waiting to hide a real one.
    for (const lever of ds.levers) {
      if (lever.deprecated || lever.category === 'macro') continue;
      const group = ds.incidence.levers[lever.code];
      if (!group) {
        problems.push(`no incidence tag for ${lever.code}`);
        continue;
      }
      const side = ds.incidence.groups[group]?.side;
      const expected = lever.classification?.side === 'receipts' ? 'pays' : 'benefits';
      if (side && side !== expected) {
        problems.push(
          `incidence tag ${group} on ${lever.code} is a ${side} group for a ${expected} lever`,
        );
      }
    }
    for (const code of Object.keys(ds.incidence.levers)) {
      if (!codes.has(code)) problems.push(`incidence tag for unknown lever "${code}"`);
    }
  }
  if (ds.electorate) {
    // A household touched by a lever the game does not have would never feel anything.
    for (const household of ds.electorate.households) {
      for (const touch of household.touches) {
        if (!codes.has(touch.code)) {
          problems.push(`household ${household.id} is touched by unknown lever "${touch.code}"`);
        }
      }
      // A group the incidence tags do not have would leave the household untouched by anything.
      for (const group of household.exposure) {
        if (ds.incidence && !ds.incidence.groups[group]) {
          problems.push(`household ${household.id} is exposed to unknown group "${group}"`);
        }
      }
    }
    for (const code of ds.electorate.reachesNone) {
      if (!codes.has(code)) problems.push(`unknown lever "${code}" reaches no household`);
    }
  }
  if (ds.guide) {
    // Every screen a player meets has its guide entry, and every bracketed word in its line its
    // definition: a missing entry would leave a step with no title, a missing term a hover with
    // no answer.
    const covered = new Set(ds.guide.stages.map((s) => s.step));
    for (const step of GUIDED_STEPS) {
      if (!covered.has(step)) problems.push(`the guide has no entry for ${step}`);
    }
    for (const stage of ds.guide.stages) {
      if (!GUIDED_STEPS.includes(stage.step)) {
        problems.push(`the guide has an entry for ${stage.step}, which is not a screen`);
      }
      if (ds.glossary) {
        for (const id of stageTerms(stage)) {
          if (!ds.glossary.terms[id]) {
            problems.push(`guide ${stage.step} refers to unknown glossary term "${id}"`);
          }
        }
      }
    }
  }
  if (ds.budget) {
    // The Budget the game starts from (ADR-0045). A measure the walk asks about names a live lever
    // costed from that very line, so disagreeing moves the figure the card shows; the
    // margin's published steps add up to the forecast the engine reproduces; every placeholder in
    // the story is one the page fills; and every fact is read from a quoted passage.
    const budget = ds.budget;
    const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
    if (!known.has(budget.scorecard)) {
      problems.push(
        `budget ${budget.id} joins scorecard "${budget.scorecard}", which is not in the registry`,
      );
    }
    for (const measure of budget.measures) {
      if (!measure.leverCode) continue;
      const lever = byCode.get(measure.leverCode);
      if (!lever) {
        problems.push(`budget measure ${measure.id} names unknown lever ${measure.leverCode}`);
        continue;
      }
      if (lever.deprecated) {
        problems.push(`budget measure ${measure.id} names shelved lever ${measure.leverCode}`);
      }
      const raw = 'rawSource' in lever.costing ? lever.costing.rawSource : undefined;
      const cited =
        raw?.kind === 'hmtScorecard' &&
        raw.sourceId === budget.scorecard &&
        raw.lines.some((l) => l.number === measure.line);
      if (!cited) {
        problems.push(
          `budget measure ${measure.id}'s lever ${measure.leverCode} is not costed from line ${measure.line} of ${budget.scorecard}`,
        );
      }
    }
    for (const [name, fact] of Object.entries(budget.facts)) {
      if (!fact.source.quote) problems.push(`budget fact ${name} quotes nothing from its source`);
    }
    if (!budget.chancellor.source.quote) {
      problems.push(`budget ${budget.id} names the Chancellor without quoting its source`);
    }
    const f = budget.facts;
    const before =
      f.headroomInMarchGbpm.gbpm +
      f.debtInterestSinceMarchGbpm.gbpm +
      f.otherChangesSinceMarchGbpm.gbpm;
    if (before !== f.headroomBeforeMeasuresGbpm.gbpm) {
      problems.push(
        `budget facts: the margin's steps since March give ${before}, not ${f.headroomBeforeMeasuresGbpm.gbpm}`,
      );
    }
    const check = ds.vintage.checks.stabilityHeadroomGbpm;
    const after = f.headroomBeforeMeasuresGbpm.gbpm + f.measuresOnCurrentBudgetGbpm.gbpm;
    if (Math.abs(after - check.value) > check.toleranceGbpm) {
      problems.push(
        `budget facts: the margin before the measures plus their effect gives ${after}, not the vintage's ${check.value}`,
      );
    }
    budget.story.forEach((line, i) => {
      for (const key of storyPlaceholders(line.text)) {
        if (!(BUDGET_STORY_FILLS as readonly string[]).includes(key)) {
          problems.push(`budget story line ${i + 1} has no fill for {${key}}`);
        }
      }
    });
    // The walk (ADR-0046): every measure a player can reverse is asked about on one card, and a
    // card asks about a lever some measure names.
    const carded = new Set(budget.themes.flatMap((t) => t.cards.map((c) => c.lever)));
    for (const measure of budget.measures) {
      if (measure.leverCode && !carded.has(measure.leverCode)) {
        problems.push(`budget measure ${measure.id}'s lever ${measure.leverCode} is on no card`);
      }
    }
    for (const theme of budget.themes) {
      for (const card of theme.cards) {
        if (cardMeasures(budget, card).length === 0) {
          problems.push(`budget card ${card.lever} in ${theme.id} reverses no measure`);
        }
      }
    }
  }
  if (ds.balance) {
    // The balance page's menus (ADR-0046): a live lever the player could reach on its own steps,
    // never a measure's (its card asks about it), never the economy, and never investment, which
    // the headroom counts only by its interest, so it would read as nearly free.
    const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
    const carded = new Set(ds.budget?.themes.flatMap((t) => t.cards.map((c) => c.lever)) ?? []);
    for (const side of ['raise', 'spend'] as const) {
      for (const option of ds.balance[side]) {
        const at = `balance ${side} ${option.code}`;
        const lever = byCode.get(option.code);
        if (!lever) {
          problems.push(`${at} names an unknown lever`);
          continue;
        }
        if (lever.deprecated || lever.status !== 'reviewed') problems.push(`${at} is not live`);
        if (lever.category === 'macro') problems.push(`${at} is a setting of the economy`);
        if (lever.classification?.currentOrCapital === 'capital') {
          problems.push(`${at} is investment, which the headroom counts only by its interest`);
        }
        if (carded.has(option.code))
          problems.push(`${at} is a measure's lever, asked about on its card`);
        if (lever.control.kind === 'toggle' && option.step !== 1) {
          problems.push(`${at} switches a toggle on with a step of ${option.step}, not 1`);
        }
        const first = lever.control.default + option.step;
        const problem = settingProblem(lever, first);
        if (problem) problems.push(`${at}'s first step, ${first}, is off the lever (${problem})`);
        const labels = lever.control.labels;
        if (lever.control.kind === 'select' && labels && !(String(first) in labels)) {
          problems.push(`${at}'s first step, ${first}, is not one of the lever's choices`);
        }
      }
    }
  }
  return problems;
}
