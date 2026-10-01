import {
  baselinePath,
  deflatorIndex,
  formatGbpBn,
  formatLevel,
  formatPct,
  fyStart,
  levelValue,
  policyYearsOf,
  realGrowthPerYear,
  sizeWords,
  type Lever,
  type OptionState,
  type YearValues,
} from '@btc/engine';
import { vintage } from '../data';
import { Term } from './Term';
import { effectWords } from '../journey/effects';

/**
 * Where a lever is planned to be, as a decision's status and a scale's resting size say it
 * (ADR-0035): "20% as planned" where the lever has a level or its own labels, else "As planned".
 */
export function plannedWords(lever: Lever): string {
  const { level, labels } = lever.control;
  if (level || labels) return `${sizeWords(lever, lever.control.default)} as planned`;
  return 'As planned';
}

export { effectWords };

const POLICY_YEARS = policyYearsOf(vintage);
const IMPLEMENTATION_YEAR = vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? '';
const DEFLATOR = vintage.economy.gdpDeflator ? deflatorIndex(vintage) : null;

/** A promise this lever is watched by, and whether the current setting crosses it. */
export interface RedLine {
  promise: string;
  /** The promise's id (a glossary word, where there is one) and its tag name (Phase 25). */
  id?: string;
  tag?: string;
  when: 'above' | 'below' | 'on';
  broken: boolean;
  /** Red (the promise's words) or amber (its spirit, Phase 23); red when unsaid. */
  severity?: 'breaks' | 'strains';
  /** The 2024 manifesto's own words (Phase 25); a promise made since when false. */
  manifesto?: boolean;
  /** False for a strain shown and scored by no audience (Phase 25). */
  scored?: boolean;
}

/** An option the player chose that this lever belongs to, and how it now stands (Phase 25). */
export interface Chosen {
  title: string;
  state: OptionState;
}

const RED_LINE_WORDS: Record<RedLine['when'], string> = {
  above: 'no rise',
  below: 'no cut',
  on: 'breaks if switched on',
};

/** A strain scored by nobody, at rest: what the move would put at risk (Phase 25). */
const AT_RISK_WORDS: Record<RedLine['when'], string> = {
  above: 'at risk if raised',
  below: 'at risk if cut',
  on: 'at risk if switched on',
};

/**
 * What a promise is called on a tag (Phase 25): "the manifesto" only for the 2024 manifesto's own
 * words, scored as such; "a promise" for a commitment made since, or a strain scored by nobody.
 */
export function promiseWords(r: Pick<RedLine, 'manifesto' | 'scored'>): {
  noun: string;
  label: string;
} {
  const manifesto = r.manifesto !== false && r.scored !== false;
  return manifesto
    ? { noun: 'the manifesto', label: 'Manifesto' }
    : { noun: 'a promise', label: 'Promise' };
}

/** A watched lever at rest: the quiet words of its tag. */
export function restingWords(r: Pick<RedLine, 'when' | 'severity' | 'scored'>): string {
  if (r.severity !== 'strains') return RED_LINE_WORDS[r.when];
  return r.scored === false ? AT_RISK_WORDS[r.when] : 'keeps its words, strains its spirit';
}

/**
 * A watched lever at rest (Phase 25): the promise by its short name, a glossary word where there is
 * one ("Tax lock: no rise"), so a newcomer can open what the promise covers where the choice is
 * made; the promise's full title follows for a screen reader.
 */
export function RestingTag({ r }: { r: RedLine }) {
  const name = r.tag ?? promiseWords(r).label;
  return (
    <span className="tag--manifesto">
      {r.id ? <Term id={r.id}>{name}</Term> : name}: {restingWords(r)}
      <span className="sr-only"> ({r.promise})</span>
    </span>
  );
}

/**
 * The warnings on the lever. A watched lever always wears a quiet tag naming the promise, so a
 * newcomer learns it before touching the control; a crossed line turns red, or amber where the
 * promise's words are kept and its spirit tested (Phase 23). A lever inside an option the player
 * chose wears the option's tag while it counts towards it, delivered or settled lower (the Chief
 * Secretary's line says which), and a red tag once it has moved the other way (Phase 25). Which
 * promise, and which option, is in the tag's text for a screen reader; a tooltip would reach only
 * a mouse.
 */
export function LeverFlags({ redLines, chosen }: { redLines: RedLine[]; chosen?: Chosen }) {
  return (
    <>
      {chosen ? (
        chosen.state === 'against' ? (
          <span className="tag--treasury tag--warn">
            Against your flagship policy<span className="sr-only">: {chosen.title}</span>
          </span>
        ) : (
          <span className="tag--treasury">
            In your flagship policies<span className="sr-only">: {chosen.title}</span>
          </span>
        )
      ) : null}
      {redLines.map((r) =>
        r.broken ? (
          <span
            key={`${r.severity ?? 'breaks'}-${r.promise}`}
            className={`tag--treasury ${r.severity === 'strains' ? 'tag--amber' : 'tag--warn'}`}
          >
            {r.severity === 'strains' ? 'Strains' : 'Breaks'} {promiseWords(r).noun}: {r.promise}
          </span>
        ) : (
          <RestingTag key={`${r.severity ?? 'breaks'}-${r.promise}`} r={r} />
        ),
      )}
    </>
  );
}

export interface LevelChange {
  from: string;
  to: string;
  note?: string;
  /**
   * Spending controls lead with growth a year after rising prices, in words (Phase 25); the cash
   * budget and the years the growth is measured over wait under "More about this" on a curated card.
   */
  real?: { from: string; to: string; note: string; fromPct: number; toPct: number; span: string };
}

/** The path a percentage-of-baseline lever produces at a setting. */
function policyValues(base: YearValues, value: number): YearValues {
  const start = fyStart(IMPLEMENTATION_YEAR);
  const out: YearValues = {};
  for (const [year, v] of Object.entries(base)) {
    out[year] = fyStart(year) >= start ? v * (1 + value / 100) : v;
  }
  return out;
}

/**
 * What a setting moves to. Rates and thresholds show their new level ("20% → 21%"); spending
 * leads with real-terms growth a year, because that is how settlements are argued about, and
 * shows the resulting cash budget beneath it.
 */
export function levelChange(lever: Lever, value: number, summaryYear?: string): LevelChange | null {
  const level = lever.control.level;
  if (level) {
    return {
      from: formatLevel(level, level.baseline),
      to: formatLevel(level, levelValue(level, value)),
    };
  }
  if (lever.costing.kind === 'pctOfBaseline') {
    const path = baselinePath(lever, vintage, POLICY_YEARS);
    const published =
      lever.costing.baseline.from === 'published' ? lever.costing.baseline.years : null;
    const year =
      (published ? [...published].sort().at(-1) : summaryYear) ??
      POLICY_YEARS[POLICY_YEARS.length - 1] ??
      '';
    const base = path.values[year] ?? 0;
    const change: LevelChange = {
      from: formatGbpBn(base, 1),
      to: formatGbpBn(base * (1 + value / 100), 1),
      note: `in ${year}`,
    };
    // Real growth runs from the last year your Budget cannot touch to the year shown above. It is
    // how settlements are argued about; a receipts line (business rates) is read in cash.
    const fromYear = POLICY_YEARS.filter((y) => fyStart(y) < fyStart(IMPLEMENTATION_YEAR)).at(-1);
    const isSpending = lever.classification?.side !== 'receipts';
    if (DEFLATOR && fromYear && isSpending && fyStart(year) > fyStart(fromYear)) {
      try {
        const before = realGrowthPerYear(path.values, DEFLATOR, fromYear, year);
        const after = realGrowthPerYear(policyValues(path.values, value), DEFLATOR, fromYear, year);
        change.real = {
          from: formatPct(before, 1, true),
          to: formatPct(after, 1, true),
          note: `a year in real terms, ${fromYear} to ${year}`,
          fromPct: before,
          toPct: after,
          span: `${fromYear} to ${year}`,
        };
      } catch {
        // No deflator for these years: the cash figures stand alone.
      }
    }
    return change;
  }
  return null;
}

/** A warning that applies now, beside a curated lever: another lever it interacts with has moved. */
export interface LeverNote {
  key: string;
  text: string;
  warn: boolean;
}

/**
 * Another lever in the Budget counts the same money as this one, and a flagship the player chose
 * holds it (Phase 26): the control stays reachable but will not move, and the card offers the way
 * back to the flagship. Step 4 never undoes a flagship; anywhere else, choosing takes the other
 * out (ADR-0036).
 */
export interface Blocked {
  /** What the other lever is called on this screen. */
  other: string;
  reason: string;
  /** The flagship that holds it: its title and its screen. */
  flagship: { title: string; to: string };
}

/**
 * What choosing this lever would take out of the Budget (ADR-0036): the levers there now that
 * count the same money, by the names this screen gives them, and why, in the first one's words.
 * The control moves as ever; the row says so before it is touched. Where every one it would take
 * out is a row of the same card, in view beside it, the reason is left to the card's fold
 * (ADR-0037), and `reason` is empty.
 */
export interface TakesOut {
  names: readonly string[];
  reason: string;
}

/**
 * The sentence a row opens its take-out line with (ADR-0036): "Choosing this takes out “A”." on a
 * tick, "Choosing a level here…" on a scale.
 */
export function takesOutWords(names: readonly string[], kind: 'tick' | 'scale'): string {
  const quoted = names.map((n) => `“${n}”`);
  const last = quoted.at(-1) ?? '';
  const list = quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} and ${last}` : last;
  return `${kind === 'tick' ? 'Choosing this' : 'Choosing a level here'} takes out ${list}.`;
}

/**
 * One of a set of ticks that contradict each other in one decision (ADR-0036): the row's box
 * becomes a radio in the set's group, which the card draws with "As planned" first, so choosing
 * one takes the others out and the arrow keys move between them.
 */
export interface Radio {
  /** The group's name, shared by every radio in the set. */
  name: string;
  checked: boolean;
  onChoose: () => void;
}
