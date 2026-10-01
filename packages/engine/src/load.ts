import type { ZodType } from 'zod';
import { DataError } from './errors.js';
import {
  advisersFileSchema,
  pmFileSchema,
  ministersFileSchema,
  interventionsFileSchema,
  optionsFileSchema,
  finetuneFileSchema,
  householdsFileSchema,
  speechFileSchema,
  incidenceFileSchema,
  guideFileSchema,
  glossaryFileSchema,
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
  InterventionsFile,
  OptionsFile,
  FinetuneFile,
  HouseholdsFile,
  SpeechFile,
  IncidenceFile,
  GuideFile,
  GlossaryFile,
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
import { fyOfDate, fyStart } from './calc/years.js';
import { FINETUNE_SIDES, deskLevers, finetuneNames, finetuneSideOf } from './game/finetune.js';
import { excludesPartners } from './game/excludes.js';
import { optionEarliestStart, shortlistedWays } from './game/options.js';
import { promiseBreaks } from './game/promises.js';
import { hasHead } from './costing/taxHead.js';
import { GUIDED_STEPS, stageTerms } from './game/guide.js';
import { resolveTargetYear } from './rules/targetYear.js';
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

export function parseInterventions(json: unknown): InterventionsFile {
  return parseWith(interventionsFileSchema, json, 'adviser interventions');
}

export function parseOptions(json: unknown): OptionsFile {
  return parseWith(optionsFileSchema, json, 'the options');
}

export function parseFinetune(json: unknown): FinetuneFile {
  return parseWith(finetuneFileSchema, json, 'the fine-tuning screens');
}

export function parseHouseholdsFile(json: unknown): HouseholdsFile {
  return parseWith(householdsFileSchema, json, 'the households');
}

export function parseSpeech(json: unknown): SpeechFile {
  return parseWith(speechFileSchema, json, 'the speech');
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
  interventions?: InterventionsFile;
  options?: OptionsFile;
  /** The curated levers of step 4 (Phase 24, ADR-0025). */
  finetune?: FinetuneFile;
  electorate?: HouseholdsFile;
  speech?: SpeechFile;
  incidence?: IncidenceFile;
  guide?: GuideFile;
  glossary?: GlossaryFile;
  reception?: ReceptionFile;
}

/**
 * Why a card cannot propose a setting: it is outside the control's range, it is where the lever
 * rests (so choosing it would change nothing), or it is off the control's steps (so the player
 * could never reach it). Shared by the options and the fine-tuning screens.
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

/**
 * The advisers' shortlist on step 3 (Phase 27, ADR-0028): the one or two best ways to deliver each
 * priority, which basic mode shows; step 4 has none and shows every policy (ADR-0041). "Best" is a
 * judgement, badged as one on the screen; these are the rules that keep it checkable. A pick counts
 * by the stability rule's target year, is on the table, and breaks no promise (a strain, amber, is
 * allowed and still shown); no two ways basic mode shows count the same money, whether by an
 * option's conflict or by their levers; and at least one pick a priority delivers it in full.
 * Whether a pick is worth £1bn needs the engine, so the tests check that.
 */
function shortlistProblems(ds: Dataset, options: OptionsFile): string[] {
  const problems: string[] = [];
  const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
  const stability = ds.rules.rules.find((r) => r.kind === 'currentBudget');
  const target = stability
    ? resolveTargetYear(stability, ds.vintage.years, 'vintage').targetYear
    : undefined;
  const promises = ds.pm?.promises ?? [];
  const desk = deskLevers(ds.contexts?.[ds.contexts.length - 1]);

  const priorities = [...new Set(options.deliver.map((o) => o.priority))];
  for (const priority of priorities) {
    const picks = shortlistedWays(options, priority);
    if (picks.length === 0) problems.push(`priority ${priority} has no pick`);
    else if (picks.length > 2) {
      problems.push(`priority ${priority} has ${picks.length} picks, not one or two`);
    } else if (!picks.some((o) => o.scale.kind === 'full')) {
      problems.push(`priority ${priority} has no pick that delivers it in full`);
    }
  }

  // What basic mode shows: the picks, and any way that moves a lever already on the desk.
  const basic = options.deliver.filter(
    (o) => o.shortlist === true || Object.keys(o.values).some((code) => desk.has(code)),
  );
  const ids = new Set(basic.map((o) => o.id));
  // The picks' levers, with the name each goes by in a message.
  const shown = new Map<string, string>();
  for (const o of basic) {
    for (const c of o.conflicts ?? []) {
      if (!ids.has(c.with)) continue;
      const other = options.deliver.find((x) => x.id === c.with);
      problems.push(
        `step 3 shows “${o.title}” and “${other?.title ?? c.with}”, which count the same money`,
      );
    }
    if (o.shortlist !== true) continue;
    const said = `step 3 picks “${o.title}”`;
    const codes = Object.keys(o.values);
    if (codes.some((code) => byCode.get(code)?.notOnTheTable)) {
      problems.push(`${said}, which is not on the table`);
    }
    const year = optionEarliestStart(o, ds.levers);
    if (target && year && fyStart(year) > fyStart(target)) {
      problems.push(`${said}, which starts in ${year}, after ${target}`);
    }
    for (const report of promiseBreaks(o.values, promises, ds.levers)) {
      if (!report.kept) problems.push(`${said}, which breaks ${report.promise.title}`);
    }
    for (const code of codes) {
      if (!shown.has(code)) shown.set(code, `“${o.title}”`);
    }
  }

  // No two picks' levers count the same money.
  const reported = new Set<string>();
  for (const [code, name] of shown) {
    const lever = byCode.get(code);
    if (!lever) continue;
    for (const partner of excludesPartners(lever, ds.levers)) {
      const other = shown.get(partner.lever.code);
      const key = [code, partner.lever.code].sort().join('|');
      if (!other || reported.has(key)) continue;
      reported.add(key);
      problems.push(`${name} and ${other} count the same money`);
    }
  }
  return problems;
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
      ds.interventions ?? null,
      ds.options ?? null,
      ds.finetune ?? null,
      ds.electorate ?? null,
      ds.speech ?? null,
      ds.incidence ?? null,
      ds.glossary ?? null,
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
    // What is already on the desk is dealt with by a lever the player can move (Phase 25), on
    // step 4, where every lever is on show.
    const onStep4 = ds.finetune ? finetuneNames(ds.finetune) : undefined;
    for (const item of context.inTray) {
      if (!codes.has(item.leverCode)) {
        problems.push(
          `context ${context.id} in-tray ${item.id} names unknown lever ${item.leverCode}`,
        );
      } else if (onStep4 && !onStep4.has(item.leverCode)) {
        problems.push(`the desk's lever ${item.leverCode} is not on step 4`);
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
    // A priority is led by a role the game has a voice for; a promise that names a lever the game
    // does not have would be a commitment the player could never keep or break.
    const roles = new Set([
      ...(ds.advisers?.advisers ?? []).map((a) => a.role),
      ...(ds.ministers?.ministers ?? []).map((m) => m.role),
    ]);
    if (roles.size > 0) {
      for (const priority of ds.pm.priorities) {
        if (!roles.has(priority.lead)) {
          problems.push(
            `priority ${priority.id} is led by "${priority.lead}", a role nobody holds`,
          );
        }
      }
    }
    if (ds.options) {
      const ids = new Set(ds.pm.priorities.map((p) => p.id));
      for (const o of ds.options.deliver) {
        if (!ids.has(o.priority)) {
          problems.push(`deliver option ${o.id} delivers unknown priority ${o.priority}`);
        }
      }
      for (const priority of ds.pm.priorities) {
        const n = ds.options.deliver.filter((o) => o.priority === priority.id).length;
        if (n < 2 || n > 5) {
          problems.push(`priority ${priority.id} has ${n} ways to deliver it; 2 to 5 expected`);
        }
      }
    }
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
  if (ds.options) {
    // An option is a bundle of lever settings the engine prices; one that names a lever the game
    // lacks, a setting the control cannot reach, or a lever left where it is could never be
    // chosen. Since Phase 24 every option is a way to deliver a priority (ADR-0025).
    const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
    const all = ds.options.deliver.map((o) => ({ screen: 'deliver', o }));
    // The adviser's line on every option is spoken by an adviser who is on that screen (Phase 23).
    const adviserById = new Map((ds.advisers?.advisers ?? []).map((a) => [a.id, a] as const));
    for (const { screen, o } of all) {
      const adviser = adviserById.get(o.advice.adviser);
      if (adviserById.size > 0 && !adviser) {
        problems.push(`${screen} option ${o.id} names unknown adviser ${o.advice.adviser}`);
      } else if (adviser && !adviser.steps.includes('deliver')) {
        problems.push(`${screen} option ${o.id}: adviser ${adviser.id} does not speak on deliver`);
      }
    }
    for (const { screen, o } of all) {
      for (const [code, value] of Object.entries(o.values)) {
        const lever = byCode.get(code);
        if (!lever) {
          problems.push(`${screen} option ${o.id} names unknown lever "${code}"`);
          continue;
        }
        if (lever.deprecated) problems.push(`${screen} option ${o.id} moves shelved lever ${code}`);
        if (lever.category === 'macro')
          problems.push(`${screen} option ${o.id} moves macro slider ${code}`);
        const setting = settingProblem(lever, value);
        if (setting === 'range') {
          problems.push(
            `${screen} option ${o.id} sets ${code} to ${value}, outside the lever's range`,
          );
        } else if (setting === 'default') {
          problems.push(`${screen} option ${o.id} leaves lever ${code} where it is`);
        } else if (setting === 'steps') {
          problems.push(
            `${screen} option ${o.id} sets ${code} to ${value}, off the control's steps`,
          );
        }
      }
    }
  }
  if (ds.finetune) {
    // Step 4's levers (Phase 24, ADR-0025), chosen as policies since Phase 26 (ADR-0027). Each is
    // a live lever on its own screen's side of the Budget; every size a policy offers is a setting
    // the lever can reach, not where it rests, and a policy's sizes go one way and grow; two
    // policies on a lever go opposite ways; a lever that is not a toggle has a plain name; a tax
    // sits in the section named for its family, one decision among that tax's (ADR-0035); a lever
    // not on the table comes after the rest of its decision; and the screen's adviser exists and
    // speaks on that step.
    const byCode = new Map(ds.levers.map((l) => [l.code, l] as const));
    const adviserById = new Map((ds.advisers?.advisers ?? []).map((a) => [a.id, a] as const));
    for (const side of FINETUNE_SIDES) {
      const screen = ds.finetune[side];
      const adviser = adviserById.get(screen.adviser);
      if (adviserById.size > 0 && !adviser) {
        problems.push(`the ${side} screen names unknown adviser ${screen.adviser}`);
      } else if (adviser && !adviser.steps.includes('finetune')) {
        problems.push(`the ${side} screen's adviser ${adviser.id} does not speak on finetune`);
      }
      // A run is what is read in one go: a decision's levers. A tax's section is its family.
      const runs = screen.groups.flatMap((section) =>
        section.decisions.map((d) => ({
          family: side === 'tax' ? section.label : undefined,
          items: d.items,
        })),
      );
      for (const { family, items } of runs) {
        let pastTheTable: string | undefined;
        for (const item of items) {
          const lever = byCode.get(item.code);
          if (!lever) {
            problems.push(`the ${side} screen offers unknown lever "${item.code}"`);
            continue;
          }
          if (lever.deprecated)
            problems.push(`the ${side} screen offers shelved lever ${item.code}`);
          if (finetuneSideOf(lever) !== side) {
            problems.push(`the ${side} screen offers ${item.code}, a ${lever.category} lever`);
          }
          if (lever.notOnTheTable) pastTheTable ??= item.code;
          else if (pastTheTable) {
            problems.push(`${item.code} comes after ${pastTheTable}, which is not on the table`);
          }
          const isToggle = lever.control.kind === 'toggle';
          if (!isToggle && !item.name) problems.push(`lever ${item.code} needs a plain name`);
          const ways = item.policies.map((policy) => {
            const said = `policy “${policy.title}”`;
            let way = 0;
            let reach = 0;
            for (const size of policy.sizes) {
              const setting = settingProblem(lever, size);
              if (setting === 'range') {
                problems.push(`${said} offers ${size}, outside the lever's range`);
              } else if (setting === 'default') {
                problems.push(`${said} offers ${size}, where the lever rests`);
              } else if (setting === 'steps') {
                problems.push(`${said} offers ${size}, off the control's steps`);
              }
              const moved = size - lever.control.default;
              if (way !== 0 && Math.sign(moved) !== way) {
                problems.push(`${said} goes both ways`);
              }
              if (Math.abs(moved) <= reach) problems.push(`${said} has sizes that do not grow`);
              way = way || Math.sign(moved);
              reach = Math.abs(moved);
            }
            if (isToggle && policy.sizes.length !== 1) {
              problems.push(`${said} is a toggle: it is switched on, in one size`);
            }
            return way;
          });
          if (ways.length === 2 && ways[0] === ways[1]) {
            problems.push(`lever ${item.code} has two policies the same way`);
          }
          if (family !== undefined && lever.group !== family) {
            problems.push(
              `tax lever ${item.code} is in the ${lever.group ?? 'no'} family, not ${family}`,
            );
          }
        }
      }
    }
    // Ticks that contradict each other in one decision may be one choice (ADR-0036). A set of
    // alternatives is ticks that exclude one another and no live lever beyond, none of them a
    // lever a flagship sets (the screen shows those as a line). Which pairs are a set is the data's
    // to say (ADR-0038): two ticks left apart stay ticks, and choosing one takes the other out.
    const live = (lever: Lever) =>
      excludesPartners(lever, ds.levers)
        .filter((p) => !p.lever.deprecated)
        .map((p) => p.lever.code);
    const flagshipSets = new Set(
      (ds.options?.deliver ?? []).flatMap((option) => Object.keys(option.values)),
    );
    const file = ds.finetune;
    const decisions = FINETUNE_SIDES.flatMap((side) =>
      file[side].groups.flatMap((section) => section.decisions),
    );
    for (const decision of decisions) {
      const sets = decision.alternatives ?? [];
      for (const alt of sets) {
        const said = `the alternatives “${alt.name}”`;
        alt.codes.forEach((code, k) => {
          const lever = byCode.get(code);
          if (!lever) return;
          if (lever.control.kind !== 'toggle') problems.push(`${said} hold ${code}, not a tick`);
          if (flagshipSets.has(code)) {
            problems.push(`${said} hold ${code}, which a flagship sets`);
          }
          const partners = live(lever);
          for (const other of alt.codes.slice(k + 1)) {
            if (!partners.includes(other)) {
              problems.push(`${said} hold ${code} and ${other}, which do not exclude each other`);
            }
          }
          for (const other of partners) {
            if (!alt.codes.includes(other)) {
              problems.push(`${said} hold ${code}, which also excludes ${other}`);
            }
          }
        });
      }
    }
  }
  if (ds.options) problems.push(...shortlistProblems(ds, ds.options));
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
  if (ds.speech) {
    if (!ds.speech.opening.default) problems.push('the speech has no default opening');
    for (const priority of ds.pm?.priorities ?? []) {
      if (!ds.speech.opening[priority.id])
        problems.push(`the speech has no opening for priority ${priority.id}`);
    }
    for (const key of ['met', 'missed']) {
      if (!ds.speech.peroration[key]) problems.push(`the speech has no ${key} peroration`);
    }
  }
  if (ds.interventions) {
    const adviserIds = new Set((ds.advisers?.advisers ?? []).map((a) => a.id));
    for (const x of ds.interventions.interventions) {
      if (adviserIds.size > 0 && !adviserIds.has(x.adviser)) {
        problems.push(`intervention ${x.id} names unknown adviser ${x.adviser}`);
      }
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
  return problems;
}
