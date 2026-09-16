/**
 * The four assumption cards moved into the engine in Phase 8 so the in-game OBR draw could choose
 * among the same published candidates (`packages/engine/src/game/scenarios.ts`, ADR-0010,
 * ADR-0012). This module keeps the web app's import paths.
 */
export {
  candidatesFor,
  describeAssumptions,
  macroCodesOf,
  matchScenario,
  scenarioCards,
  type MacroCandidate,
  type ScenarioCard,
  type ScenarioSetting,
} from '@btc/engine';
