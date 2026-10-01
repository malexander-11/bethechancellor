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
import type { householdsReferenceSchema } from '../schema/reference.schema.js';
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
  journeyStepSchema,
} from '../schema/journey.schema.js';
import type {
  contextFileSchema,
  contextReadingSchema,
  suggestionRuleSchema,
} from '../schema/context.schema.js';
import type {
  prioritySchema,
  pmFileSchema,
  promiseSchema,
  simulatedLineSchema,
  ministersFileSchema,
  ministerSchema,
  ministerBandSchema,
  interventionsFileSchema,
  householdsFileSchema,
  householdSchema,
  householdTouchSchema,
  speechFileSchema,
  speechFragmentSchema,
  incidenceFileSchema,
  verdictsFileSchema,
  verdictKindSchema,
  receptionAudienceSchema,
  receptionBandSchema,
  receptionFileSchema,
  receptionRuleSchema,
  optionsFileSchema,
  deliverOptionSchema,
  optionScaleSchema,
  finetuneAlternativesSchema,
  finetuneDecisionSchema,
  finetuneFileSchema,
  finetuneItemSchema,
  finetunePolicySchema,
  finetuneSectionSchema,
  finetuneSideSchema,
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
export type SimulatedLine = z.infer<typeof simulatedLineSchema>;
export type PmFile = z.infer<typeof pmFileSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Promise_ = z.infer<typeof promiseSchema>;
export type MinistersFile = z.infer<typeof ministersFileSchema>;
export type Minister = z.infer<typeof ministerSchema>;
export type MinisterBand = z.infer<typeof ministerBandSchema>;
export type InterventionsFile = z.infer<typeof interventionsFileSchema>;
export type OptionsFile = z.infer<typeof optionsFileSchema>;
export type DeliverOption = z.infer<typeof deliverOptionSchema>;
export type OptionScale = z.infer<typeof optionScaleSchema>;
export type FinetuneFile = z.infer<typeof finetuneFileSchema>;
export type FinetuneSide = z.infer<typeof finetuneSideSchema>;
export type FinetuneSection = z.infer<typeof finetuneSectionSchema>;
export type FinetuneDecision = z.infer<typeof finetuneDecisionSchema>;
export type FinetuneAlternatives = z.infer<typeof finetuneAlternativesSchema>;
export type FinetuneItem = z.infer<typeof finetuneItemSchema>;
export type FinetunePolicy = z.infer<typeof finetunePolicySchema>;
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
export type ReceptionFile = z.infer<typeof receptionFileSchema>;
export type ReceptionAudience = z.infer<typeof receptionAudienceSchema>;
export type ReceptionRule = z.infer<typeof receptionRuleSchema>;
export type ReceptionBand = z.infer<typeof receptionBandSchema>;
export type RawSource = z.infer<typeof rawSourceSchema>;
export type TaxHead = z.infer<typeof taxHeadSchema>;
export type SpendingHead = z.infer<typeof spendingHeadSchema>;
export type GrowthHead = z.infer<typeof growthHeadSchema>;
export type UpratingRule = z.infer<typeof upratingRuleSchema>;

/** Values keyed by fiscal year, e.g. { "2029-30": 23600 }. Money is £ million. */
export type YearValues = Record<string, number>;
