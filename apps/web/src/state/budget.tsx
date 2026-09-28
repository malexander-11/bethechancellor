import {
  computeOutcome,
  decodePermalink,
  encodePermalink,
  freshGame,
  type GamePermalink,
  type Outcome,
} from '@btc/engine';
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ESTIMATE, MACRO_CODES, levers, rules, vintage } from '../data';

export interface BudgetState {
  leverValues: Record<string, number>;
  warnings: string[];
  /**
   * The playthrough (ADR-0011, ADR-0025): how far it has got and the priorities agreed. Absent
   * until the briefing's "Set your priorities" starts it on today's estimate.
   */
  game?: GamePermalink;
}

export type BudgetAction =
  | { type: 'setLever'; code: string; value: number }
  | { type: 'setLevers'; values: Record<string, number> }
  | { type: 'reset' }
  | { type: 'dismissWarnings' }
  | { type: 'startGame' }
  | { type: 'updateGame'; patch: Partial<GamePermalink> };

/**
 * The settings every Budget is worked out under (Phase 26): the interest on its own borrowing is
 * counted, and it is judged by the rules as they stand. The desk's two switches for them are gone.
 */
export const SETTINGS = { debtInterestFeedback: true, assessAsOf: 'vintage' } as const;

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

/** Said of a link that switched off the interest on its own borrowing, or judged it by next year's rule. */
export const EXPERT_WARNING =
  'This link changed a setting that has gone. Every Budget now counts the interest on its own borrowing, and is judged by the rules as they stand.';

/** Said on the briefing of a link that carries measures but no game (Phase 26). */
export const MEASURES_NOTE = 'This link’s measures will be in your Budget when you start.';

/** True when a set of lever values moves anything but the economy. */
function hasMeasures(values: Readonly<Record<string, number>>): boolean {
  return Object.keys(values).some((code) => !MACRO_CODES.includes(code));
}

export function initialStateFromLocation(search: string): BudgetState {
  const { state, warnings } = decodePermalink(search, levers);
  const out: BudgetState = { leverValues: state.leverValues, warnings };
  // The expert switches went with the desk (Phase 26): every Budget counts the interest on its own
  // borrowing and is judged by the rules as they stand. A link that set either is read without it.
  if (state.debtInterestFeedback === false || state.assessAsOf === 'nextBudget') {
    out.warnings = [...out.warnings, EXPERT_WARNING];
  }
  if (state.game) {
    // Every game is played on today's estimate (ADR-0025). A link from before Phase 24 may carry
    // the forecast its seed drew or figures of its own; it opens on the estimate, and says so.
    out.game = state.game;
    if (!onEstimate(out.leverValues)) {
      out.leverValues = withValues(out.leverValues, ESTIMATE);
      out.warnings = [...out.warnings, ESTIMATE_WARNING];
    }
  } else if (hasMeasures(out.leverValues)) {
    // With no game a link opens on the briefing (Phase 26), whose button starts the game with the
    // link's measures in it; the one line says they are not lost.
    out.warnings = [...out.warnings, MEASURES_NOTE];
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
    case 'setLevers':
      return { ...state, leverValues: withValues(state.leverValues, action.values) };
    case 'reset':
      // A reset ends the game too: every choice goes with the levers, and what the link said.
      return { leverValues: {}, warnings: [] };
    case 'startGame':
      // Every game starts on today's estimate; one already under way keeps its choices. The link's
      // measures are in it now, so the line promising them has done its job.
      return {
        ...state,
        leverValues: withValues(state.leverValues, ESTIMATE),
        game: state.game ?? freshGame(),
        warnings: state.warnings.filter((w) => w !== MEASURES_NOTE),
      };
    case 'updateGame':
      return state.game ? { ...state, game: { ...state.game, ...action.patch } } : state;
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
      ...SETTINGS,
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
          ...SETTINGS,
        },
      }),
    [state.leverValues],
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
