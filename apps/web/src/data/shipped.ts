import type {
  AdvisersFile,
  ContextFile,
  FinetuneFile,
  GlossaryFile,
  GuideFile,
  HouseholdsFile,
  HouseholdsReference,
  IncidenceFile,
  InterventionsFile,
  Lever,
  MinistersFile,
  OptionsFile,
  PmFile,
  ReceptionFile,
  RuleSet,
  SourcesFile,
  Vintage,
} from '@btc/engine';

/**
 * The data set as the browser receives it (apps/web/build/dataset.ts): checked against its schemas
 * and validated at build time, with only the levers the game offers, and without what no screen
 * shows (the published tables behind a costing, the passages quoted from sources, the source files'
 * hashes and notes, and a description where a headline stands in for it).
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
  interventions: InterventionsFile;
  options: OptionsFile;
  finetune: FinetuneFile;
  electorate: HouseholdsFile;
  incidence: IncidenceFile;
  guide: GuideFile;
  glossary: GlossaryFile;
  levers: Lever[];
}
