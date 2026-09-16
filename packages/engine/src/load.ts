import type { ZodType } from 'zod';
import { DataError } from './errors.js';
import {
  advisersFileSchema,
  briefingsFileSchema,
  calendarSchema,
  drawsFileSchema,
  pmFileSchema,
  ministersFileSchema,
  interventionsFileSchema,
  compromiseFileSchema,
  rabbitFileSchema,
  householdsFileSchema,
  speechFileSchema,
  incidenceFileSchema,
  verdictsFileSchema,
  reactionsFileSchema,
  contextFileSchema,
  hmrcExtractSchema,
  householdsReferenceSchema,
  leverSchema,
  dwpBenefitExtractSchema,
  pesaExtractSchema,
  presetsFileSchema,
  reliefExtractSchema,
  ruleSetSchema,
  scorecardExtractSchema,
  sourcesFileSchema,
  sr25ExtractSchema,
  vintageSchema,
} from './schema/index.js';
import type {
  AdvisersFile,
  BriefingsFile,
  Calendar,
  DrawsFile,
  PmFile,
  MinistersFile,
  InterventionsFile,
  CompromiseFile,
  RabbitFile,
  HouseholdsFile,
  SpeechFile,
  IncidenceFile,
  VerdictsFile,
  ReactionsFile,
  ContextFile,
  HmrcExtract,
  HouseholdsReference,
  Lever,
  DwpBenefitExtract,
  PesaExtract,
  PresetsFile,
  ReliefExtract,
  RuleSet,
  ScorecardExtract,
  SourcesFile,
  Sr25Extract,
  Vintage,
} from './types/data.js';
import { hasHead } from './costing/taxHead.js';
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

export function parsePresets(json: unknown): PresetsFile {
  return parseWith(presetsFileSchema, json, 'presets');
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

export function parseBriefings(json: unknown): BriefingsFile {
  return parseWith(briefingsFileSchema, json, 'briefings');
}

export function parseReactions(json: unknown): ReactionsFile {
  return parseWith(reactionsFileSchema, json, 'Budget day reactions');
}

export function parseDraws(json: unknown): DrawsFile {
  return parseWith(drawsFileSchema, json, 'forecast draws');
}

export function parseCalendar(json: unknown): Calendar {
  return parseWith(calendarSchema, json, 'journey calendar');
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

export function parseCompromise(json: unknown): CompromiseFile {
  return parseWith(compromiseFileSchema, json, 'the compromises');
}

export function parseRabbit(json: unknown): RabbitFile {
  return parseWith(rabbitFileSchema, json, 'the rabbit');
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

export function parseVerdicts(json: unknown): VerdictsFile {
  return parseWith(verdictsFileSchema, json, 'kinds of Budget');
}

export interface Dataset {
  sources: SourcesFile;
  vintage: Vintage;
  rules: RuleSet;
  levers: Lever[];
  presets?: PresetsFile;
  households?: HouseholdsReference;
  /** "What has changed since the forecast" files, newest last. */
  contexts?: ContextFile[];
  advisers?: AdvisersFile;
  briefings?: BriefingsFile;
  draws?: DrawsFile;
  calendar?: Calendar;
  pm?: PmFile;
  ministers?: MinistersFile;
  interventions?: InterventionsFile;
  compromise?: CompromiseFile;
  rabbit?: RabbitFile;
  electorate?: HouseholdsFile;
  speech?: SpeechFile;
  incidence?: IncidenceFile;
  verdicts?: VerdictsFile;
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

/** Cross-file checks: every source reference resolves, lever codes are unique, presets name real levers. */
export function validateDataset(ds: Dataset): string[] {
  const problems: string[] = [];
  const known = new Set(ds.sources.sources.map((s) => s.id));
  const referenced = new Set<string>();
  collectSourceIds(
    [
      ds.vintage,
      ds.rules,
      ds.levers,
      ds.presets ?? null,
      ds.households ?? null,
      ds.contexts ?? null,
      ds.briefings ?? null,
      ds.draws ?? null,
      ds.pm ?? null,
      ds.ministers ?? null,
      ds.interventions ?? null,
      ds.compromise ?? null,
      ds.rabbit ?? null,
      ds.electorate ?? null,
      ds.speech ?? null,
      ds.incidence ?? null,
      ds.verdicts ?? null,
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
      if (!ds.levers.some((l) => l.id === interaction.withLever)) {
        problems.push(`lever ${lever.id} interacts with unknown lever ${interaction.withLever}`);
      }
    }
  }
  for (const preset of ds.presets?.presets ?? []) {
    for (const code of Object.keys(preset.leverValues)) {
      if (!codes.has(code)) problems.push(`preset ${preset.id} sets unknown lever code ${code}`);
    }
  }
  const adviserById = new Map((ds.advisers?.advisers ?? []).map((a) => [a.id, a] as const));
  const groupsByStep = {
    taxes: new Set(ds.levers.filter((l) => l.category === 'tax').map((l) => l.group ?? '')),
    spending: new Set(
      ds.levers
        .filter((l) => l.category === 'spend' || l.category === 'welfare')
        .map((l) => l.group ?? ''),
    ),
    // The campaign levers sit on the Policies tab; `recommendations` is its Phase 5 name.
    policies: new Set(ds.levers.filter((l) => l.category === 'campaign').map((l) => l.group ?? '')),
  };
  const briefingIds = new Set<string>();
  for (const briefing of ds.briefings?.briefings ?? []) {
    if (briefingIds.has(briefing.id)) problems.push(`duplicate briefing id ${briefing.id}`);
    briefingIds.add(briefing.id);
    const adviser = adviserById.get(briefing.adviser);
    if (!adviser) {
      problems.push(`briefing ${briefing.id} names unknown adviser ${briefing.adviser}`);
    } else if (!adviser.steps.includes(briefing.step)) {
      problems.push(
        `briefing ${briefing.id}: adviser ${adviser.id} does not speak on ${briefing.step}`,
      );
    }
    if (briefing.group) {
      const groups =
        briefing.step === 'taxes'
          ? groupsByStep.taxes
          : briefing.step === 'spending'
            ? groupsByStep.spending
            : briefing.step === 'recommendations' || briefing.step === 'policies'
              ? groupsByStep.policies
              : undefined;
      if (!groups || !groups.has(briefing.group)) {
        problems.push(
          `briefing ${briefing.id}: no lever group "${briefing.group}" on step ${briefing.step}`,
        );
      }
    }
  }
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
      const alt = reading.alternatives;
      if (alt) {
        if (!reading.leverCode) {
          problems.push(
            `context ${context.id} reading ${reading.id} carries a published range but sets no lever`,
          );
        }
        // The gap rule averages over the years both rows share, so a mismatch would silently
        // change which years a scenario is built from.
        const years = Object.keys(alt.against.series).sort().join(',');
        for (const [role, row] of [
          ['lowest', alt.lowest],
          ['highest', alt.highest],
        ] as const) {
          if (Object.keys(row.series).sort().join(',') !== years) {
            problems.push(
              `context ${context.id} reading ${reading.id}: the ${role} row covers different years from its comparator`,
            );
          }
        }
      }
    }
    const kinds = new Set<string>();
    for (const scenario of context.scenarios ?? []) {
      if (kinds.has(scenario.kind)) {
        problems.push(`context ${context.id} has two ${scenario.kind} scenarios`);
      }
      kinds.add(scenario.kind);
      const needsRange = scenario.kind === 'optimistic' || scenario.kind === 'pessimistic';
      if (needsRange && !context.readings.some((r) => r.alternatives)) {
        problems.push(
          `context ${context.id} offers a ${scenario.kind} scenario but no reading carries a published range`,
        );
      }
    }
  }
  if (ds.draws) {
    const latest = ds.contexts?.[ds.contexts.length - 1];
    const macro = new Map(ds.levers.filter((l) => l.category === 'macro').map((l) => [l.code, l]));
    // Consideration ids that sit on certified rows: naming one would let a draw re-score an HMRC
    // rate row or a Treasury scorecard line, which the honesty contract forbids (ADR-0012).
    const certified = new Set(['hmrc-direct', 'hmrc-2026-deferred', 'hmt-costing']);
    const allConsiderations = new Set(ds.levers.flatMap((l) => l.considerations.map((c) => c.id)));
    for (const outcome of ds.draws.outcomes) {
      for (const [code, name] of Object.entries(outcome.macro)) {
        const lever = macro.get(code);
        if (!lever) {
          problems.push(`draw ${outcome.id} sets "${code}", which is not a macro lever`);
          continue;
        }
        const reading = latest?.readings.find((r) => r.leverCode === code);
        if (!reading) {
          problems.push(`draw ${outcome.id} sets "${code}" but no context reading drives it`);
          continue;
        }
        const has =
          name === 'obr' ||
          (name === 'adviser' && reading.suggestion !== undefined) ||
          ((name === 'lowest' || name === 'highest') && reading.alternatives !== undefined);
        if (!has) {
          problems.push(
            `draw ${outcome.id} names the ${name} figure for "${code}", which the ${reading.id} reading does not carry`,
          );
        }
      }
      for (const revision of outcome.revisions) {
        if (certified.has(revision.considerationId)) {
          problems.push(
            `draw ${outcome.id} revises "${revision.considerationId}", a caveat that sits on certified rows`,
          );
        } else if (!allConsiderations.has(revision.considerationId)) {
          problems.push(
            `draw ${outcome.id} revises "${revision.considerationId}", which no lever carries`,
          );
        }
      }
    }
  }
  if (ds.pm) {
    // A flagship or a promise that names a lever the desk does not have would be a commitment
    // the player could never keep or break; the PM may only talk about real levers.
    for (const flagship of ds.pm.flagships) {
      const lever = ds.levers.find((l) => l.code === flagship.target.code);
      if (!lever) {
        problems.push(`flagship ${flagship.id} targets unknown lever "${flagship.target.code}"`);
      } else if (
        flagship.target.value < lever.control.min ||
        flagship.target.value > lever.control.max
      ) {
        problems.push(
          `flagship ${flagship.id} targets ${flagship.target.value}, outside the lever's range`,
        );
      }
      if (!ds.pm.reactions[flagship.id]) {
        problems.push(`the PM has no reaction to flagship ${flagship.id}`);
      }
    }
    const promises = ds.pm.promises.flatMap((p) => [
      p,
      ...(p.pushBack?.concession ? [p.pushBack.concession] : []),
    ]);
    for (const promise of promises) {
      for (const rule of promise.breaks) {
        if (!codes.has(rule.code)) {
          problems.push(`promise ${promise.id} watches unknown lever "${rule.code}"`);
        }
      }
    }
  }
  if (ds.ministers) {
    // Every spending and welfare lever has someone to speak for it, and nobody speaks for a lever
    // the desk does not have. A band that never applies is a line the player can never hear.
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
        problems.push(`minister for "${minister.code}" speaks for a lever the desk does not have`);
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
  if (ds.rabbit) {
    // A rabbit is a lever setting; one that names a lever the desk lacks, or a setting the slider
    // cannot reach, could never be pulled out of the hat.
    const adviserIds = new Set((ds.advisers?.advisers ?? []).map((a) => a.id));
    for (const spec of [ds.rabbit.intro, ds.rabbit.strengthen, ds.rabbit.keep]) {
      if (adviserIds.size > 0 && !adviserIds.has(spec.adviser)) {
        problems.push(`the rabbit names unknown adviser ${spec.adviser}`);
      }
    }
    for (const option of ds.rabbit.options) {
      const lever = ds.levers.find((l) => l.code === option.code);
      if (!lever) {
        problems.push(`rabbit ${option.id} names unknown lever "${option.code}"`);
      } else if (option.value < lever.control.min || option.value > lever.control.max) {
        problems.push(`rabbit ${option.id} sets ${option.value}, outside the lever's range`);
      } else if (option.value === lever.control.default) {
        problems.push(`rabbit ${option.id} leaves the lever where it is`);
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
  if (ds.verdicts) {
    for (const kind of ds.verdicts.kinds) {
      if (kind.when.themeIs && !(ds.pm?.themes ?? []).some((t) => t.id === kind.when.themeIs)) {
        problems.push(`kind of Budget ${kind.id} names unknown theme ${kind.when.themeIs}`);
      }
    }
  }
  if (ds.electorate) {
    // A household touched by a lever the desk does not have would never feel anything.
    for (const household of ds.electorate.households) {
      for (const touch of household.touches) {
        if (!codes.has(touch.code)) {
          problems.push(`household ${household.id} is touched by unknown lever "${touch.code}"`);
        }
      }
    }
  }
  if (ds.speech) {
    if (!ds.speech.opening.default) problems.push('the speech has no default opening');
    for (const theme of ds.pm?.themes ?? []) {
      if (!ds.speech.opening[theme.id])
        problems.push(`the speech has no opening for theme ${theme.id}`);
    }
    for (const key of ['met', 'missed', 'breach']) {
      if (!ds.speech.peroration[key]) problems.push(`the speech has no ${key} peroration`);
    }
    for (const key of ['keep', 'flagship', ...(ds.rabbit?.options.map((o) => o.id) ?? [])]) {
      if (!ds.speech.rabbit[key]) problems.push(`the speech has no flourish for rabbit ${key}`);
    }
  }
  if (ds.compromise) {
    const adviserIds = new Set((ds.advisers?.advisers ?? []).map((a) => a.id));
    for (const [route, spec] of Object.entries(ds.compromise.routes)) {
      if (adviserIds.size > 0 && !adviserIds.has(spec.adviser)) {
        problems.push(`compromise route ${route} names unknown adviser ${spec.adviser}`);
      }
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
  if (ds.calendar) {
    const budgetDay = ds.rules.assessment.nextFormalAssessmentOn;
    for (const stage of ds.calendar.stages) {
      if (stage.on > budgetDay) {
        problems.push(
          `calendar puts ${stage.step} on ${stage.on}, after the Budget on ${budgetDay}`,
        );
      }
    }
  }
  return problems;
}
