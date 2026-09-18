import type { z } from 'zod';
import type {
  badgeSchema,
  derivationStepSchema,
  seriesSchema,
  sourceRefSchema,
} from '../schema/provenance.schema.js';
import type { sourceDocSchema, sourcesFileSchema } from '../schema/sources.schema.js';
import type {
  sensitivitySchema,
  vintageSchema,
  welfareCapStatusSchema,
} from '../schema/vintage.schema.js';
import type { fiscalRuleSchema, ruleSetSchema } from '../schema/rules.schema.js';
import type {
  considerationSchema,
  controlSchema,
  costingSchema,
  leverSchema,
} from '../schema/lever.schema.js';
import type {
  householdsReferenceSchema,
  presetSchema,
  presetsFileSchema,
} from '../schema/reference.schema.js';
import type {
  hmrcExtractSchema,
  dwpBenefitExtractSchema,
  pesaExtractSchema,
  reliefExtractSchema,
  scorecardExtractSchema,
  sr25ExtractSchema,
} from '../schema/derived.schema.js';
import type {
  adviserSchema,
  advisersFileSchema,
  briefingSchema,
  briefingsFileSchema,
  reactionBandSchema,
  reactionSignalSchema,
  reactionsFileSchema,
  journeyStepSchema,
} from '../schema/journey.schema.js';
import type {
  contextFileSchema,
  contextReadingSchema,
  contextScenarioSchema,
  scenarioKindSchema,
  suggestionRuleSchema,
} from '../schema/context.schema.js';
import type {
  calendarSchema,
  drawOutcomeSchema,
  drawRevisionSchema,
  drawsFileSchema,
  flagshipSchema,
  macroCandidateSchema,
  pmFileSchema,
  promiseSchema,
  simulatedLineSchema,
  themeSchema,
  ministersFileSchema,
  ministerSchema,
  ministerBandSchema,
  interventionsFileSchema,
  interventionSchema,
  interventionWhenSchema,
  compromiseFileSchema,
  rabbitFileSchema,
  rabbitOptionSchema,
  householdsFileSchema,
  householdSchema,
  householdTouchSchema,
  speechFileSchema,
  speechFragmentSchema,
  incidenceFileSchema,
  verdictsFileSchema,
  verdictKindSchema,
} from '../schema/game.schema.js';
import type {
  glossaryFileSchema,
  glossaryTermSchema,
  guideFileSchema,
  guideStageSchema,
} from '../schema/guide.schema.js';
import type {
  growthHeadSchema,
  levelSchema,
  milestoneSchema,
  rawSourceSchema,
  spendingHeadSchema,
  taxHeadSchema,
  upratingRuleSchema,
} from '../schema/lever.schema.js';

export type Badge = z.infer<typeof badgeSchema>;
export type SourceRef = z.infer<typeof sourceRefSchema>;
export type DerivationStep = z.infer<typeof derivationStepSchema>;
export type Series = z.infer<typeof seriesSchema>;
export type SourceDoc = z.infer<typeof sourceDocSchema>;
export type SourcesFile = z.infer<typeof sourcesFileSchema>;
export type Sensitivity = z.infer<typeof sensitivitySchema>;
export type Vintage = z.infer<typeof vintageSchema>;
export type WelfareCapStatus = z.infer<typeof welfareCapStatusSchema>;
export type FiscalRule = z.infer<typeof fiscalRuleSchema>;
export type CurrentBudgetRule = Extract<FiscalRule, { kind: 'currentBudget' }>;
export type StockFallingRule = Extract<FiscalRule, { kind: 'stockFalling' }>;
export type WelfareCapRule = Extract<FiscalRule, { kind: 'welfareCap' }>;
export type RuleSet = z.infer<typeof ruleSetSchema>;
export type Lever = z.infer<typeof leverSchema>;
export type LeverControl = z.infer<typeof controlSchema>;
export type LevelDisplay = z.infer<typeof levelSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Costing = z.infer<typeof costingSchema>;
export type Consideration = z.infer<typeof considerationSchema>;
export type HouseholdsReference = z.infer<typeof householdsReferenceSchema>;
export type HmrcExtract = z.infer<typeof hmrcExtractSchema>;
export type ScorecardExtract = z.infer<typeof scorecardExtractSchema>;
export type Sr25Extract = z.infer<typeof sr25ExtractSchema>;
export type ReliefExtract = z.infer<typeof reliefExtractSchema>;
export type PesaExtract = z.infer<typeof pesaExtractSchema>;
export type DwpBenefitExtract = z.infer<typeof dwpBenefitExtractSchema>;
export type ContextFile = z.infer<typeof contextFileSchema>;
export type ContextReading = z.infer<typeof contextReadingSchema>;
export type SuggestionRule = z.infer<typeof suggestionRuleSchema>;
export type ContextScenario = z.infer<typeof contextScenarioSchema>;
export type ScenarioKind = z.infer<typeof scenarioKindSchema>;
export type DrawsFile = z.infer<typeof drawsFileSchema>;
export type DrawOutcome = z.infer<typeof drawOutcomeSchema>;
export type DrawRevision = z.infer<typeof drawRevisionSchema>;
export type MacroCandidateName = z.infer<typeof macroCandidateSchema>;
export type SimulatedLine = z.infer<typeof simulatedLineSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type PmFile = z.infer<typeof pmFileSchema>;
export type Flagship = z.infer<typeof flagshipSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Promise_ = z.infer<typeof promiseSchema>;
export type MinistersFile = z.infer<typeof ministersFileSchema>;
export type Minister = z.infer<typeof ministerSchema>;
export type MinisterBand = z.infer<typeof ministerBandSchema>;
export type InterventionsFile = z.infer<typeof interventionsFileSchema>;
export type InterventionSpec = z.infer<typeof interventionSchema>;
export type InterventionWhen = z.infer<typeof interventionWhenSchema>;
export type CompromiseFile = z.infer<typeof compromiseFileSchema>;
export type RabbitFile = z.infer<typeof rabbitFileSchema>;
export type RabbitOption = z.infer<typeof rabbitOptionSchema>;
export type HouseholdsFile = z.infer<typeof householdsFileSchema>;
export type Household = z.infer<typeof householdSchema>;
export type HouseholdTouch = z.infer<typeof householdTouchSchema>;
export type SpeechFile = z.infer<typeof speechFileSchema>;
export type SpeechFragment = z.infer<typeof speechFragmentSchema>;
export type IncidenceFile = z.infer<typeof incidenceFileSchema>;
export type VerdictsFile = z.infer<typeof verdictsFileSchema>;
export type VerdictKind = z.infer<typeof verdictKindSchema>;
export type GuideFile = z.infer<typeof guideFileSchema>;
export type GuideStage = z.infer<typeof guideStageSchema>;
export type GlossaryFile = z.infer<typeof glossaryFileSchema>;
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type JourneyStep = z.infer<typeof journeyStepSchema>;
export type Adviser = z.infer<typeof adviserSchema>;
export type AdvisersFile = z.infer<typeof advisersFileSchema>;
export type Briefing = z.infer<typeof briefingSchema>;
export type BriefingsFile = z.infer<typeof briefingsFileSchema>;
export type ReactionsFile = z.infer<typeof reactionsFileSchema>;
export type ReactionSignalSpec = z.infer<typeof reactionSignalSchema>;
export type ReactionBand = z.infer<typeof reactionBandSchema>;
export type RawSource = z.infer<typeof rawSourceSchema>;
export type TaxHead = z.infer<typeof taxHeadSchema>;
export type SpendingHead = z.infer<typeof spendingHeadSchema>;
export type GrowthHead = z.infer<typeof growthHeadSchema>;
export type UpratingRule = z.infer<typeof upratingRuleSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type PresetsFile = z.infer<typeof presetsFileSchema>;

/** Values keyed by fiscal year, e.g. { "2029-30": 23600 }. Money is £ million. */
export type YearValues = Record<string, number>;
