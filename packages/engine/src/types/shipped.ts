import type {
  AdvisersFile,
  BalanceFile,
  BudgetFile,
  ContextFile,
  FinetuneFile,
  GlossaryFile,
  GuideFile,
  HouseholdsFile,
  HouseholdsReference,
  IncidenceFile,
  Lever,
  MinistersFile,
  PmFile,
  ReceptionFile,
  RuleSet,
  ScorecardExtract,
  SourcesFile,
  Vintage,
} from './data.js';

/**
 * The data set as the game ships it (`@btc/pipeline/shipped`), to the browser and to the server:
 * checked against its schemas and validated when it is built, with only the levers the game offers,
 * and without what no screen shows (the published tables behind a costing, the passages quoted
 * from sources, the source files' hashes and notes, and a description where a headline stands in
 * for it).
 */
export interface ShippedDataset {
  sources: SourcesFile;
  vintage: Vintage;
  rules: RuleSet;
  households: HouseholdsReference;
  context: ContextFile;
  advisers: AdvisersFile;
  reception: ReceptionFile;
  pm: PmFile;
  ministers: MinistersFile;
  finetune: FinetuneFile;
  electorate: HouseholdsFile;
  incidence: IncidenceFile;
  guide: GuideFile;
  glossary: GlossaryFile;
  /** The Budget the game starts from (ADR-0045), and the scorecard its measures join to by line. */
  budget: BudgetFile;
  /** The balance page's two menus (ADR-0046). */
  balance: BalanceFile;
  scorecard: ScorecardExtract;
  levers: Lever[];
}
