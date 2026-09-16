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
import { levers, rules, vintage } from '../data';

export interface BudgetState {
  leverValues: Record<string, number>;
  debtInterestFeedback: boolean;
  assessAsOf: AssessAsOf;
  warnings: string[];
  /** The playthrough (ADR-0011). Absent until the player confirms an outlook and a seed is minted. */
  game?: GamePermalink;
  /** The policy levers as they stood when the in-game OBR update arrived. */
  snapshot?: Record<string, number>;
}

export type BudgetAction =
  | { type: 'setLever'; code: string; value: number }
  | { type: 'applyPreset'; leverValues: Record<string, number> }
  | { type: 'setLevers'; values: Record<string, number> }
  | { type: 'reset' }
  | { type: 'setFeedback'; value: boolean }
  | { type: 'setAssessAsOf'; value: AssessAsOf }
  | { type: 'dismissWarnings' }
  | { type: 'startGame'; seed: number }
  | { type: 'updateGame'; patch: Partial<GamePermalink> }
  | { type: 'setSnapshot'; values: Record<string, number> };

export const IMPLEMENTATION_YEAR =
  vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? vintage.years.inYear;

export function initialStateFromLocation(search: string): BudgetState {
  const { state, warnings } = decodePermalink(search, levers);
  const out: BudgetState = {
    leverValues: state.leverValues,
    debtInterestFeedback: state.debtInterestFeedback ?? true,
    assessAsOf: state.assessAsOf ?? 'vintage',
    warnings,
  };
  if (state.game) out.game = state.game;
  if (state.snapshot) out.snapshot = state.snapshot;
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
    case 'setLevers': {
      const leverValues = { ...state.leverValues };
      for (const [code, value] of Object.entries(action.values)) {
        const lever = levers.find((l) => l.code === code);
        if (lever && value === lever.control.default) delete leverValues[code];
        else leverValues[code] = value;
      }
      return { ...state, leverValues };
    }
    case 'reset': {
      // A reset ends the game too: the seed, the snapshot and every choice go with the levers.
      const next: BudgetState = {
        leverValues: {},
        debtInterestFeedback: true,
        assessAsOf: 'vintage',
        warnings: state.warnings,
      };
      return next;
    }
    case 'startGame':
      // A game already under way keeps its seed: the draw must not change under the player.
      return state.game ? state : { ...state, game: freshGame(action.seed) };
    case 'updateGame':
      return state.game ? { ...state, game: { ...state.game, ...action.patch } } : state;
    case 'setSnapshot':
      return { ...state, snapshot: { ...action.values } };
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
      ...(state.snapshot ? { snapshot: state.snapshot } : {}),
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
          ...(state.game && Object.keys(state.game.delays).length > 0
            ? { implementationYearByCode: state.game.delays }
            : {}),
        },
      }),
    [state.leverValues, state.debtInterestFeedback, state.assessAsOf, state.game],
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
