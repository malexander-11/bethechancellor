import {
  computeOutcome,
  decodePermalink,
  encodePermalink,
  freshGame,
  type AssessAsOf,
  type GamePermalink,
  type Outcome,
} from '@btc/engine';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ESTIMATE, MACRO_CODES, levers, rules, vintage } from '../data';

export interface BudgetState {
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  warnings: string[];
  /**
   * The playthrough (ADR-0011, ADR-0025): how far it has got and the priorities agreed. Absent in
   * the sandbox, and until the briefing's "Set your priorities" starts it on today's estimate.
   */
  game?: GamePermalink;
}

export type BudgetAction =
  | { type: 'setLever'; code: string; value: number }
  | { type: 'applyPreset'; leverValues: Record<string, number> }
  | { type: 'setLevers'; values: Record<string, number> }
  | { type: 'reset' }
  | { type: 'resetPolicy' }
  | { type: 'setFeedback'; value: boolean }
  | { type: 'setAssessAsOf'; value: AssessAsOf }
  | { type: 'dismissWarnings' }
  | { type: 'startGame' }
  | { type: 'updateGame'; patch: Partial<GamePermalink> };

export const IMPLEMENTATION_YEAR =
  vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? vintage.years.inYear;

/** Set lever values, dropping any that land on the lever's default (the codec omits them). */
function withValues(
  current: Record<string, number>,
  values: Readonly<Record<string, number>>,
): Record<string, number> {
  const leverValues = { ...current };
  for (const [code, value] of Object.entries(values)) {
    const lever = levers.find((l) => l.code === code);
    if (lever && value === lever.control.default) delete leverValues[code];
    else leverValues[code] = value;
  }
  return leverValues;
}

/** The economy's settings in a set of lever values, with the defaults written out as nought. */
function economyOf(values: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(MACRO_CODES.map((code) => [code, values[code] ?? 0]));
}

/** True when a set of lever values carries today's estimate of the economy exactly. */
export function onEstimate(values: Readonly<Record<string, number>>): boolean {
  const mine = economyOf(values);
  const estimate = economyOf(ESTIMATE);
  return MACRO_CODES.every((code) => mine[code] === estimate[code]);
}

export const ESTIMATE_WARNING =
  'Every game now plays on today’s estimate of the economy, so this link’s own economic figures were replaced.';

export function initialStateFromLocation(search: string): BudgetState {
  const { state, warnings } = decodePermalink(search, levers);
  const out: BudgetState = {
    leverValues: state.leverValues,
    debtInterestFeedback: state.debtInterestFeedback ?? true,
    assessAsOf: state.assessAsOf ?? 'vintage',
    warnings,
  };
  if (state.game) {
    // Every game is played on today's estimate (ADR-0025). A link from before Phase 24 may carry
    // the forecast its seed drew or figures of its own; it opens on the estimate, with a warning
    // the desk shows beside the link's other warnings.
    out.game = state.game;
    if (!onEstimate(out.leverValues)) {
      out.leverValues = withValues(out.leverValues, ESTIMATE);
      out.warnings = [...warnings, ESTIMATE_WARNING];
    }
  }
  return out;
}

export function reducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'setLever': {
      const leverValues = { ...state.leverValues };
      const lever = levers.find((l) => l.code === action.code);
      if (lever && action.value === lever.control.default) delete leverValues[action.code];
      else leverValues[action.code] = action.value;
      return { ...state, leverValues };
    }
    case 'applyPreset':
      return { ...state, leverValues: { ...action.leverValues } };
    case 'setLevers':
      return { ...state, leverValues: withValues(state.leverValues, action.values) };
    case 'reset': {
      // A reset ends the game too: every choice goes with the levers.
      const next: BudgetState = {
        leverValues: {},
        debtInterestFeedback: true,
        assessAsOf: 'vintage',
        warnings: state.warnings,
      };
      return next;
    }
    case 'resetPolicy': {
      // "Put every lever back": the policy goes, the economy and the game stay.
      const leverValues: Record<string, number> = {};
      for (const code of MACRO_CODES) {
        const value = state.leverValues[code];
        if (value !== undefined) leverValues[code] = value;
      }
      return { ...state, leverValues };
    }
    case 'startGame':
      // Every game starts on today's estimate; one already under way keeps its choices.
      return {
        ...state,
        leverValues: withValues(state.leverValues, ESTIMATE),
        game: state.game ?? freshGame(),
      };
    case 'updateGame':
      return state.game ? { ...state, game: { ...state.game, ...action.patch } } : state;
    case 'setFeedback':
      return { ...state, debtInterestFeedback: action.value };
    case 'setAssessAsOf':
      return { ...state, assessAsOf: action.value };
    case 'dismissWarnings':
      return { ...state, warnings: [] };
  }
}

/** Every page of the journey carries the budget in its query string; only the reference pages do not. */
export function isJourneyPath(path: string): boolean {
  return !['/methodology', '/about'].some((p) => path === p || path.startsWith(`${p}/`));
}

export function permalinkQuery(state: BudgetState): string {
  return encodePermalink(
    {
      vintageCode: vintage.permalinkCode,
      rulesCode: rules.permalinkCode,
      implementationYear: IMPLEMENTATION_YEAR,
      leverValues: state.leverValues,
      debtInterestFeedback: state.debtInterestFeedback,
      assessAsOf: state.assessAsOf,
      ...(state.game ? { game: state.game } : {}),
    },
    levers,
  );
}

interface BudgetContextValue {
  state: BudgetState;
  dispatch: (action: BudgetAction) => void;
  outcome: Outcome;
  query: string;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children, search }: { children: ReactNode; search?: string }) {
  const [state, dispatch] = useReducer(
    reducer,
    search ?? (typeof window === 'undefined' ? '' : window.location.search),
    initialStateFromLocation,
  );
  const outcome = useMemo(
    () =>
      computeOutcome({
        vintage,
        rules,
        levers,
        settings: {
          leverValues: state.leverValues,
          implementationYear: IMPLEMENTATION_YEAR,
          debtInterestFeedback: state.debtInterestFeedback,
          assessAsOf: state.assessAsOf,
        },
      }),
    [state.leverValues, state.debtInterestFeedback, state.assessAsOf],
  );
  const query = useMemo(() => permalinkQuery(state), [state]);

  // The URL is the source of truth for a budget: keep it in step on the budget pages.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (!isJourneyPath(path)) return;
    const id = window.setTimeout(() => {
      const next = `${path}?${query}`;
      if (`${window.location.pathname}${window.location.search}` !== next) {
        window.history.replaceState(window.history.state, '', next);
      }
    }, 150);
    return () => window.clearTimeout(id);
  }, [query]);

  const value = useMemo(() => ({ state, dispatch, outcome, query }), [state, outcome, query]);
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider');
  return ctx;
}
