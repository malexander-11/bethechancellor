/**
 * The suggestion rule moved into the engine in Phase 8 so the in-game OBR draw could share it
 * (`packages/engine/src/game/scenarios.ts`). This module keeps the web app's import paths.
 */
export {
  formatReading,
  gapOf,
  meanSeriesGap,
  suggestSetting,
  suggestedSettings,
  toSliderValue,
  wouldClamp,
  type Suggestion,
} from '@btc/engine';
