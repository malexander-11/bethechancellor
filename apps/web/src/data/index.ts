import {
  parseAdvisers,
  parseBriefings,
  parsePm,
  parseMinisters,
  parseInterventions,
  parseOptions,
  parseFinetune,
  parseHouseholdsFile,
  parseSpeech,
  parseIncidence,
  parseVerdicts,
  parseGuide,
  parseGlossary,
  guideFor as guideStageFor,
  finetuneNames,
  macroCodesOf,
  suggestedSettings,
  parseReception,
  parseContext,
  parseHouseholds,
  parseLever,
  parseRules,
  parseSources,
  parseVintage,
  validateDataset,
  type Adviser,
  type Briefing,
  type JourneyStep,
  type Lever,
  type SourceDoc,
} from '@btc/engine';
import advisersJson from '@data/journey/advisers.json';
import briefingsJson from '@data/journey/briefings.json';
import pmJson from '@data/journey/pm.json';
import ministersJson from '@data/journey/ministers.json';
import interventionsJson from '@data/journey/interventions.json';
import optionsJson from '@data/journey/options.json';
import finetuneJson from '@data/journey/finetune.json';
import electorateJson from '@data/journey/households.json';
import speechJson from '@data/journey/speech.json';
import incidenceJson from '@data/journey/incidence.json';
import verdictsJson from '@data/journey/verdicts.json';
import guideJson from '@data/journey/guide.json';
import glossaryJson from '@data/journey/glossary.json';
import receptionJson from '@data/journey/reception.json';
import contextJson from '@data/context/2026-09.json';
import householdsJson from '@data/reference/uk-households.json';
import rulesJson from '@data/rules/charter-2026-02.json';
import sourcesJson from '@data/sources/sources.json';
import vintageJson from '@data/vintages/obr-2026-03/vintage.json';

const leverModules = import.meta.glob('../../../../data/levers/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export const sources = parseSources(sourcesJson);
export const vintage = parseVintage(vintageJson);
export const rules = parseRules(rulesJson);
export const households = parseHouseholds(householdsJson);
export const context = parseContext(contextJson);
export const advisers = parseAdvisers(advisersJson);
export const briefings = parseBriefings(briefingsJson);
export const reception = parseReception(receptionJson);
export const pm = parsePm(pmJson);
export const ministers = parseMinisters(ministersJson);
export const interventions = parseInterventions(interventionsJson);
export const options = parseOptions(optionsJson);
/** Step 4's curated tax and spending levers (Phase 24, ADR-0025). */
export const finetune = parseFinetune(finetuneJson);
export const electorate = parseHouseholdsFile(electorateJson);
export const speech = parseSpeech(speechJson);
export const incidence = parseIncidence(incidenceJson);
export const verdicts = parseVerdicts(verdictsJson);
export const guide = parseGuide(guideJson);
export const glossary = parseGlossary(glossaryJson);
export const levers: Lever[] = Object.keys(leverModules)
  .sort()
  .map((key) => parseLever(leverModules[key]))
  .filter((lever) => lever.status === 'reviewed' && !lever.deprecated);

/**
 * Today's estimate (Phase 24, ADR-0025): the OBR's March forecast on today's borrowing costs and
 * prices, each setting the advisers' stated rule applied to a published reading. Every game is
 * played on it.
 */
export const ESTIMATE: Readonly<Record<string, number>> = suggestedSettings(
  context.readings,
  levers,
);

/** The levers the estimate sets: the economy, not policy. */
export const MACRO_CODES: readonly string[] = macroCodesOf(context.readings);

export const sourcesById: ReadonlyMap<string, SourceDoc> = new Map(
  sources.sources.map((s) => [s.id, s] as const),
);

const problems = validateDataset({
  sources,
  vintage,
  rules,
  levers,
  households,
  contexts: [context],
  advisers,
  briefings,
  pm,
  ministers,
  interventions,
  options,
  finetune,
  electorate,
  speech,
  incidence,
  verdicts,
  guide,
  glossary,
  reception,
});
if (problems.length > 0) {
  throw new Error(`data set is inconsistent:\n - ${problems.join('\n - ')}`);
}

export const adviserById: ReadonlyMap<string, Adviser> = new Map(
  advisers.advisers.map((a) => [a.id, a] as const),
);

/** The guide entry for a screen; the old step names find their screen. */
export function guideFor(step: JourneyStep) {
  return guideStageFor(guide, step);
}

const FINETUNE_NAMES = finetuneNames(finetune);

/**
 * The plain name a lever goes by on the fine-tuning screens, when it is one of theirs ("The main
 * rate of VAT"; a toggle's policy title): what the review and the notes call it (Phase 26).
 */
export function finetuneName(code: string): string | undefined {
  return FINETUNE_NAMES.get(code);
}

/** The briefings an adviser gives on a step: Budget day's, behind the workings. */
export function briefingsFor(step: JourneyStep): Briefing[] {
  return briefings.briefings.filter((b) => b.step === step);
}
