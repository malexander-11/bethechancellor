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
  type Lever,
  type LeverEffect,
  type OptionState,
  type SimulatedLine,
  type YearValues,
} from '@btc/engine';
import { vintage } from '../data';
import { Milestones } from './Milestones';
import { Fragment, useId, useState, type ReactNode } from 'react';
import { AdviceLine } from './AdviceLine';
import { BlockedNotice } from './BlockedNotice';
import { ProvenanceDrawer } from './ProvenanceDrawer';
import { Term } from './Term';
import { useWorkings } from '../journey/workings';
import { settledLine } from '../journey/levers';
import {
  borrowingImprovement,
  currentBudgetImprovement,
  effectWords,
  growthWords,
  laterStartYear,
  reliefWords,
  UNCHANGED_BELOW_GBPM,
} from '../journey/effects';

const MINUS = '−';

export function formatLeverValue(lever: Lever, value: number): string {
  const decimals = Math.max(0, (lever.control.step.toString().split('.')[1] ?? '').length);
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  const abs = Math.abs(value).toFixed(decimals);
  switch (lever.control.unit) {
    case 'p':
      return `${sign}${abs}p`;
    case 'pp':
      // "+1 point", never "pp" (Phase 25): a point is how a rate's change is said aloud.
      return `${sign}${abs} ${Math.abs(value) === 1 ? 'point' : 'points'}`;
    case 'pct':
      return `${sign}${abs}%`;
    case 'GBP':
      return `${sign}£${Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: decimals })}`;
    case 'GBPbn':
      return `${sign}£${abs}bn`;
    case 'pctRealPerYear':
      return `${sign}${abs}% a year`;
    case 'bool':
      return value === 1 ? 'On' : 'Off';
    default:
      return `${sign}${abs}`;
  }
}

/** The same, without a trailing ".0": "−1%" for a whole step, as a sentence would say it. */
export function formatLeverValueShort(lever: Lever, value: number): string {
  return formatLeverValue(lever, value).replace(/(\d)\.0(?!\d)/, '$1');
}

/** A spending lever read as a share of its budget (Phase 25): "1% less", "10% more". */
export function shareWords(lever: Lever, value: number): string {
  const size = formatLeverValueShort(lever, Math.abs(value)).replace(/^\+/, '');
  return `${size} ${value < 0 ? 'less' : 'more'}`;
}

/**
 * A setting in the words its size button uses (Phase 26): the level where the lever has one
 * ("21%", "£210"), a select's own label ("Abolish (0%)"), else the change as a share ("1% less",
 * "10% more", "£2 more").
 */
export function sizeWords(lever: Lever, value: number): string {
  const label = lever.control.labels?.[String(value)];
  if (label) return label.replace(/ \(as now\)$/, '');
  const level = lever.control.level;
  if (level) return formatLevel(level, levelValue(level, value));
  return shareWords(lever, value);
}

/**
 * Where a lever is planned to be, as a decision's status and a scale's resting size say it
 * (ADR-0035): "20% as planned" where the lever has a level or its own labels, else "As planned".
 */
export function plannedWords(lever: Lever): string {
  const { level, labels } = lever.control;
  if (level || labels) return `${sizeWords(lever, lever.control.default)} as planned`;
  return 'As planned';
}

/** A scale's planned radio (ADR-0035): the level, and beneath it that it is the plan. */
function PlannedLevel({ lever }: { lever: Lever }) {
  const { level, labels } = lever.control;
  if (!level && !labels) return <span className="lever__size-name">As planned</span>;
  return (
    <>
      <span className="lever__size-name">{sizeWords(lever, lever.control.default)}</span>{' '}
      <span className="lever__size-level">as planned</span>
    </>
  );
}

/** A spending line priced as a share of its forecast path (departments, benefits, investment). */
export function isShareOfSpending(lever: Lever): boolean {
  return lever.costing.kind === 'pctOfBaseline' && lever.classification?.side !== 'receipts';
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
 * The control moves as ever; the card says so before it is touched.
 */
export interface TakesOut {
  names: readonly string[];
  reason: string;
}

/**
 * The sentence a card opens its take-out line with (ADR-0036): "Choosing this takes out “A”." on a
 * tick, "Choosing a level here…" on a tax's scale, "Choosing a size here…" on a policy with sizes.
 */
export function takesOutWords(names: readonly string[], kind: 'tick' | 'scale' | 'sizes'): string {
  const quoted = names.map((n) => `“${n}”`);
  const last = quoted.at(-1) ?? '';
  const list = quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} and ${last}` : last;
  const choosing =
    kind === 'tick'
      ? 'Choosing this'
      : kind === 'scale'
        ? 'Choosing a level here'
        : 'Choosing a size here';
  return `${choosing} takes out ${list}.`;
}

/**
 * One of a set of ticks that contradict each other in one decision (ADR-0036): the card's box
 * becomes a radio in the set's group, which the screen draws with "As planned" first, so choosing
 * one takes the others out and the arrow keys move between them.
 */
export interface Radio {
  /** The group's name, shared by every radio in the set. */
  name: string;
  checked: boolean;
  onChoose: () => void;
}

/**
 * A policy's sizes on a step-4 card (Phase 26, ADR-0027): the settings it offers, smallest first
 * and all one way, and what they are called. On a tax, a scale (ADR-0035): every level both ways
 * and where the lever is planned to be, low to high, each radio named by the level it sets.
 */
export interface SizeChoice {
  /** Settings of the lever. One is a tick; two or three are radios; a scale's include the plan. */
  values: readonly number[];
  /** Small and Large; or Small, Medium and Large. None for a tick or a scale. */
  labels: readonly string[];
  /** A tax's one scale (ADR-0035): the planned level is a radio among the rest. */
  scale?: boolean;
  /**
   * The lever is set the other way, by the lever's other policy: its title and where it stands.
   * Choosing a size here replaces it, so this card shows no price and no effect of its own.
   */
  replaces?: string;
}

/**
 * What a size would do while the lever rests (Phase 24, one line a way since ADR-0035): in the
 * conditional and in plain ink, and the headroom that would leave, red only below nought.
 */
export interface Hint {
  text: string;
  headroom?: string;
  negative?: boolean;
}

/** The plain line a relief cost carries on its card (Phase 25): no number of its own. */
export const RELIEF_LINE =
  'HMRC’s cost of the tax break. The real sum would be less, as people change what they do.';

/**
 * A lever's card on step 4 (Phase 24; policies with sizes since Phase 26, ADR-0027), drawn by
 * PolicyCard: the policy's title, its sizes as radios or one tick (a radio, in a set of ticks that
 * contradict each other, ADR-0036), the price at rest or the effect once chosen, the adviser's
 * line, what choosing it would take out, the tags that change what choosing it means, and the
 * lever's own headline and caveats under "More about this". The desk's sliders, its select and its
 * long card went with it (Phase 26).
 */
export function LeverControl({
  lever,
  value,
  effect,
  summaryYear,
  onChange,
  redLines = [],
  chosen,
  displayTitle,
  hints = [],
  advice,
  notes = [],
  blocked,
  takesOut,
  radio,
  sizes,
  headingLevel = 3,
  children,
}: {
  lever: Lever;
  value: number;
  effect?: LeverEffect;
  summaryYear?: string;
  onChange: (value: number) => void;
  /** The manifesto red lines watching this lever (Phase 9): shown quietly, red when crossed. */
  redLines?: RedLine[];
  /** The option this lever belongs to, if the player chose one that moves it. */
  chosen?: Chosen;
  /** A plain title of the curated screens' own (Phase 24): the control's name, in place of the lever's. */
  displayTitle?: string;
  /**
   * What a size would do, while the lever rests (Phase 24): the numbers in view before anything
   * moves, in the conditional and in plain ink, so they cannot read as money already in the Budget
   * (Phase 25). A scale gives one line a way (ADR-0035). Once the lever has moved, the effect line
   * takes their place.
   */
  hints?: readonly Hint[];
  /**
   * One adviser's line on the lever (Phase 24). On the fine-tuning screens the screen's lead names
   * the adviser once, so a card's line carries no name (Phase 25).
   */
  advice?: { who?: string; line: SimulatedLine };
  /** Warnings that apply now: a lever this one interacts with has moved. */
  notes?: readonly LeverNote[];
  /**
   * A flagship the player chose holds a lever that counts the same money (Phase 26): the control
   * stays reachable but will not move, and says why and where to change the flagship.
   */
  blocked?: Blocked;
  /** Choosing this would take out levers in the Budget that count the same money (ADR-0036). */
  takesOut?: TakesOut;
  /** One of a set of ticks that contradict each other: a radio in place of the box (ADR-0036). */
  radio?: Radio;
  /** The policy's sizes (Phase 26): radios, or one tick. */
  sizes: SizeChoice;
  /** The title's heading level: 4 under a family subhead in a fold (Phase 26), else 3. */
  headingLevel?: 3 | 4;
  /** Anything to show beneath the lever: the minister's line, on a spending lever that has moved. */
  children?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const workings = useWorkings();
  const isToggle = lever.control.kind === 'toggle';
  const change = !isToggle ? levelChange(lever, value, summaryYear) : null;
  const isCapital = lever.classification?.currentOrCapital === 'capital';
  const isFinancialTransaction = lever.classification?.psnflTreatment === 'financialTransaction';
  const cashOut = effect
    ? Object.values(effect.financialTransactions).reduce((a, b) => a + b, 0)
    : 0;
  const barnett = lever.classification?.barnettConsequential === true;
  const commitment = lever.commitment;
  const notOnTheTable = lever.notOnTheTable;
  const earliest = lever.earliestStart;
  const title = displayTitle ?? lever.title;
  // What the number rests on: the costing's own caveats, plus why a teaching option is here and
  // where a department stands in the OBR's forecast. One click, no words on the surface.
  const assumes = [
    ...(notOnTheTable ? [notOnTheTable.note] : []),
    ...(commitment ? [commitment.text] : []),
    ...(earliest ? [earliest.text] : []),
    ...('caveats' in lever.costing ? lever.costing.caveats : []),
  ];
  const isDefault = value === lever.control.default;
  const Heading = headingLevel === 4 ? 'h4' : 'h3';
  // Set the other way by the lever's other policy, a single setting (a tick), or moved its way to
  // a setting none of its sizes is (an old link, or a flagship's value left behind when its
  // priority was dropped).
  const otherWay = sizes.replaces !== undefined;
  const tick = sizes.values.length === 1;
  const scale = sizes.scale === true;
  const offGrid = !isDefault && !otherWay && !sizes.values.some((v) => Math.abs(v - value) < 1e-9);
  const improvement =
    effect && summaryYear && !isFinancialTransaction
      ? isCapital
        ? borrowingImprovement(effect, summaryYear)
        : currentBudgetImprovement(effect, summaryYear)
      : null;
  // A card that cannot start before the summary year says so, and names the first year it moves
  // money (ADR-0021).
  const improve = (e: LeverEffect, y: string) =>
    isCapital ? borrowingImprovement(e, y) : currentBudgetImprovement(e, y);
  const laterStart =
    effect && summaryYear && improvement !== null
      ? laterStartYear(effect, summaryYear, isCapital, POLICY_YEARS)
      : undefined;
  const lookupPoints =
    lever.costing.kind === 'lookupTable'
      ? lever.costing.points
          .map((p) => p.input)
          .filter((p) => p !== 0)
          .map((p) => formatLeverValue(lever, p))
      : null;
  const showHint = hints.length > 0 && isDefault;
  // The control is described by the one-line headline and, once it has moved, by what it does;
  // at rest, by what its smallest size would do.
  const hasEffectLine =
    (!otherWay && improvement !== null && summaryYear !== undefined) ||
    (!otherWay && isFinancialTransaction && cashOut !== 0) ||
    showHint ||
    otherWay;
  const describedBy = [
    blocked ? `${id}-blocked` : null,
    takesOut ? `${id}-takesout` : null,
    `${id}-desc`,
    hasEffectLine ? `${id}-effect` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const relief = lever.reliefCost === true;
  // A blocked lever stays in the tab order but does not move: the notice says why.
  const change_ = (next: number) => {
    if (!blocked) onChange(next);
  };
  const words = (improvement: number) => {
    const plain = effectWords(improvement, isCapital, lever.classification?.side === 'receipts');
    return relief ? reliefWords(plain) : plain;
  };
  const cashWords = change?.real
    ? `Cash: ${isDefault ? change.to : `${change.from} → ${change.to}`} ${change.note ?? ''}; growth measured from ${change.real.span}.`
    : '';

  const notOnTheTableTag = notOnTheTable ? (
    <span className="tag tag--quiet">Not on the table</span>
  ) : null;
  const earliestTag = earliest ? (
    <span className="tag tag--quiet">
      {/* One flex item, so the space before the month survives the inline-flex tag. */}
      <span>
        <Term id="earliest-start">Earliest start</Term> April {earliest.year.slice(0, 4)}
      </span>
      <span className="sr-only">: {earliest.text}</span>
    </span>
  ) : null;
  const commitmentTag = commitment ? (
    <span className="tag">
      <Term id={commitment.kind}>
        {commitment.kind === 'protected' ? 'Protected' : 'Unprotected'}
      </Term>
      <span className="sr-only">: {commitment.text}</span>
    </span>
  ) : null;
  const lookupTag = lookupPoints ? (
    <span className="tag">
      <Term id="hmrc-points">HMRC points only</Term>
      <span className="sr-only">
        : the game&rsquo;s figures sit at {lookupPoints.join(', ')}, each worked from a published
        figure; between them it draws a straight line.
      </span>
    </span>
  ) : null;
  const barnettTag = barnett ? (
    <span className="tag">
      <Term id="barnett">Barnett applies</Term>
      <span className="sr-only">
        : a change here also moves the Scottish, Welsh and Northern Irish block grants, described in
        the sources and not counted in the number.
      </span>
    </span>
  ) : null;
  const desc = (
    <p className="lever__desc" id={`${id}-desc`}>
      {lever.headline ?? lever.description}
    </p>
  );
  const milestones = lever.milestones?.length ? <Milestones milestones={lever.milestones} /> : null;
  const financialLine =
    !otherWay && isFinancialTransaction && cashOut !== 0 ? (
      <p className="lever__effect" id={`${id}-effect`}>
        Cash to borrow: {formatGbpBn(Math.abs(cashOut), 1)}
        <span className="lever__effect-note">
          {' '}
          · buying an asset is not spending, so borrowing and the debt rule barely move. The
          interest on the money is charged separately.
        </span>
      </p>
    ) : null;
  // A spending line moved is read as money against its plan, in the one year the card uses
  // (Phase 25): "£2.6bn less than planned in 2029-30", never a second percentage.
  const spent =
    effect && summaryYear
      ? (effect.currentSpending[summaryYear] ?? 0) + (effect.capitalSpending[summaryYear] ?? 0)
      : 0;
  const againstPlan =
    Math.abs(spent) < UNCHANGED_BELOW_GBPM
      ? `Barely different from the plan in ${summaryYear ?? ''}`
      : `${formatGbpBn(Math.abs(spent), 1)} ${spent < 0 ? 'less' : 'more'} than planned in ${summaryYear ?? ''}`;
  // Past the range its source's figure covers, a straight-line figure is our arithmetic, and the
  // card says so (Phase 25).
  const sourceRange = lever.control.sourceRange;
  const beyondSource =
    sourceRange !== undefined && (value < sourceRange.min || value > sourceRange.max);
  // The effect, in plain ink (Phase 25): a tax that raises money is not good news in green, and a
  // cut is not bad news in red; the bar's headroom is where the score is kept.
  const effectLine =
    !otherWay && improvement !== null && summaryYear ? (
      <p className="lever__effect" id={`${id}-effect`}>
        {isShareOfSpending(lever) ? (
          againstPlan
        ) : (
          <>
            {isCapital ? 'Borrowing' : 'Day-to-day budget'} in {summaryYear}:{' '}
            {laterStart && effect ? (
              <>
                nothing yet; from {laterStart} {words(improve(effect, laterStart))}
              </>
            ) : (
              words(improvement)
            )}
          </>
        )}
        {isCapital ? (
          <span className="lever__effect-note">
            {' '}
            · investment counts against the debt rule, not the day-to-day rule
          </span>
        ) : null}
        {beyondSource ? <span className="lever__effect-note"> {sourceRange.text}</span> : null}
      </p>
    ) : null;
  const hintLine = showHint ? (
    <p className="lever__effect lever__hint lever__hints" id={`${id}-effect`}>
      {hints.map((hint, i) => (
        <Fragment key={hint.text}>
          {i > 0 ? ' ' : null}
          <span className="lever__hint-line">
            {hint.text}
            {hint.headroom ? (
              <>
                {' · headroom would be '}
                <span className={hint.negative ? 'amount--worse' : undefined}>{hint.headroom}</span>
              </>
            ) : null}
          </span>
        </Fragment>
      ))}
    </p>
  ) : null;
  // The lever is set the other way (Phase 26): choosing a size here replaces that policy.
  const replacesLine = otherWay ? (
    <p className="lever__effect lever__replaces" id={`${id}-effect`}>
      Choosing this replaces {sizes.replaces}.
    </p>
  ) : null;
  // Set its way, but at none of its sizes: what it is now, so no size reads as chosen.
  const nowLine = offGrid ? <p className="lever__now">Now {sizeWords(lever, value)}</p> : null;
  const reliefLine = relief ? <p className="lever__relief">{RELIEF_LINE}</p> : null;
  const blockedLine = blocked ? (
    <BlockedNotice
      id={`${id}-blocked`}
      other={blocked.other}
      reason={blocked.reason}
      flagship={blocked.flagship}
    />
  ) : null;
  // What choosing would take out, said before anything is touched (ADR-0036): the control still
  // moves, and its price already counts the others as gone.
  const takesOutLine = takesOut ? (
    <p className="lever__takes-out" id={`${id}-takesout`}>
      <strong>{takesOutWords(takesOut.names, tick ? 'tick' : scale ? 'scale' : 'sizes')}</strong>{' '}
      {takesOut.reason}
    </p>
  ) : null;
  const adviceLine = advice ? <AdviceLine {...advice} /> : null;
  // A flagship ask trimmed short of what was chosen is settled lower, in the Chief Secretary's
  // words (Phase 25): the option still counts, as a start, and its minister will say so.
  const settled = chosen?.state === 'adjusted' ? settledLine(lever) : null;
  const settledEl = settled ? <AdviceLine who={settled.who} line={settled.line} /> : null;
  const noteLines =
    notes.length > 0 ? (
      <ul className="lever__notes">
        {notes.map((n) => (
          <li key={n.key} className={`choice__overlap${n.warn ? ' choice__overlap--warn' : ''}`}>
            {n.warn ? 'Warning: ' : ''}
            {n.text}
          </li>
        ))}
      </ul>
    ) : null;
  const actions =
    workings || (!isDefault && !otherWay) ? (
      <div className="lever__actions">
        {workings ? (
          <button
            type="button"
            className="linklike"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'Hide detail' : 'Detail and sources'}
            <span className="sr-only"> for {lever.shortTitle}</span>
          </button>
        ) : null}
        {!isDefault && !otherWay ? (
          <button type="button" className="linklike" onClick={() => change_(lever.control.default)}>
            Undo
            <span className="sr-only"> for {title}</span>
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={`lever lever--curated${tick ? ' lever--toggle' : ''}${blocked ? ' lever--blocked' : ''}`}
      role="group"
      aria-labelledby={`${id}-title`}
    >
      <div className="lever__head">
        {tick ? (
          <Heading className="lever__title" id={`${id}-title`}>
            <label htmlFor={id} className="lever__toggle-label">
              {radio ? (
                // One of a set (ADR-0036): choosing it takes the others out; "As planned", the
                // set's first radio, puts them all back.
                <input
                  id={id}
                  type="radio"
                  name={radio.name}
                  checked={radio.checked}
                  aria-describedby={describedBy}
                  onChange={radio.onChoose}
                />
              ) : (
                <input
                  id={id}
                  type="checkbox"
                  checked={!isDefault && !otherWay}
                  aria-describedby={describedBy}
                  aria-disabled={blocked ? true : undefined}
                  onChange={(e) =>
                    change_(
                      e.target.checked
                        ? (sizes.values[0] ?? lever.control.default)
                        : lever.control.default,
                    )
                  }
                />
              )}
              {title}
            </label>
          </Heading>
        ) : (
          // The sizes' fieldset names itself; the heading is the card's title.
          <Heading className="lever__title" id={`${id}-title`}>
            {title}
          </Heading>
        )}
        <span className="lever__flags">
          <LeverFlags redLines={redLines} chosen={chosen} />
        </span>
      </div>
      {!isToggle ? (
        <>
          {/* At rest a scale's planned radio names the level, so the line waits for a move. */}
          {scale && isDefault ? null : (
            <div className="lever__value">
              {change?.real ? (
                // Spending: growth a year after rising prices, in words (Phase 25); the cash budget
                // waits under "More about this".
                <strong className="lever__growth">
                  {growthWords(change.real.fromPct, change.real.toPct, !isDefault)}
                </strong>
              ) : change ? (
                isDefault ? (
                  // No "20% → 20%" at rest (Phase 25): the level, as planned.
                  <>
                    <strong className="lever__level-to">{change.to}</strong>
                    {change.note ? <span className="lever__level-note"> {change.note}</span> : null}
                    <span className="lever__delta">as planned</span>
                  </>
                ) : (
                  <>
                    <span className="lever__level-from">{change.from}</span>
                    <span className="lever__arrow" aria-hidden="true">
                      {' → '}
                    </span>
                    <strong className="lever__level-to">{change.to}</strong>
                    {change.note ? <span className="lever__level-note"> {change.note}</span> : null}
                    <span className="lever__delta">{formatLeverValue(lever, value)}</span>
                  </>
                )
              ) : (
                <>
                  <strong>{isDefault ? 'As planned' : formatLeverValue(lever, value)}</strong>
                  {!isDefault && lever.control.formatLabel ? ` ${lever.control.formatLabel}` : ''}
                </>
              )}
            </div>
          )}
          {tick ? null : (
            // Small, Medium and Large (Phase 26): native radios, so arrow keys move between them;
            // the size and its setting on two lines, with no symbol read aloud between. A scale's
            // radios are named by the level each sets, the planned one saying so (ADR-0035).
            <fieldset
              className={`lever__sizes${scale ? ' lever__sizes--scale' : ''}`}
              aria-describedby={describedBy}
            >
              {/* The card already carries the title; its sizes are a group of their own. */}
              <legend className="sr-only">{scale ? 'Level' : 'Size'}</legend>
              {sizes.values.map((v, i) => {
                const on = Math.abs(v - value) < 1e-9;
                const planned = scale && Math.abs(v - lever.control.default) < 1e-9;
                return (
                  <label key={v} className={`lever__size${on ? ' lever__size--on' : ''}`}>
                    <input
                      type="radio"
                      name={`${id}-size`}
                      value={v}
                      checked={on}
                      aria-disabled={blocked ? true : undefined}
                      onChange={() => change_(v)}
                    />
                    <span className="lever__size-text">
                      {!scale ? (
                        <>
                          <span className="lever__size-name">{sizes.labels[i]}</span>{' '}
                          <span className="lever__size-level">{sizeWords(lever, v)}</span>
                        </>
                      ) : planned ? (
                        <PlannedLevel lever={lever} />
                      ) : (
                        <span className="lever__size-name">{sizeWords(lever, v)}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
        </>
      ) : null}
      {blockedLine}
      {takesOutLine}
      {nowLine}
      {financialLine}
      {effectLine}
      {replacesLine}
      {hintLine}
      {reliefLine}
      {adviceLine}
      {settledEl}
      {noteLines}
      {children}
      <details className="more more--quiet lever__more">
        <summary>
          More about this<span className="sr-only">: {title}</span>
        </summary>
        <div className="more__body">
          {desc}
          {/* The cash budget and the years live here on a phone (Phase 25). */}
          {cashWords ? <p className="lever__cash-note">{cashWords}</p> : null}
          {milestones}
          {notOnTheTableTag || earliestTag || commitmentTag || lookupTag || barnettTag ? (
            <p className="lever__tags">
              {notOnTheTableTag}
              {earliestTag}
              {commitmentTag}
              {lookupTag}
              {barnettTag}
            </p>
          ) : null}
          {assumes.length > 0 ? (
            <>
              <p className="lever__assumes-title">What this assumes</p>
              <ul className="lever__assumes-list">
                {assumes.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </details>
      {actions}
      {open && workings ? <ProvenanceDrawer lever={lever} effect={effect} /> : null}
    </div>
  );
}
