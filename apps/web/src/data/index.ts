import {
  guideFor as guideStageFor,
  finetuneNames,
  macroCodesOf,
  suggestedSettings,
  type Adviser,
  type JourneyStep,
  type SourceDoc,
} from '@btc/engine';
import dataset from 'virtual:btc-dataset';

/**
 * The data set, read and checked against its schemas at build time and validated as the game ships
 * it (`@btc/pipeline/shipped`): the browser only parses it.
 */
export const {
  sources,
  vintage,
  rules,
  households,
  context,
  advisers,
  reception,
  pm,
  ministers,
  interventions,
  options,
  electorate,
  incidence,
  guide,
  glossary,
  levers,
} = dataset;
/** Step 4's curated tax and spending levers (Phase 24, ADR-0025). */
export const finetune = dataset.finetune;

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
