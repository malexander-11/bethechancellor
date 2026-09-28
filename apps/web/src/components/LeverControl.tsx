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
import { useId, useState, type ReactNode } from 'react';
import { AdviceLine } from './AdviceLine';
import { BlockedNotice } from './BlockedNotice';
import { LabelBadge } from './LabelBadge';
import { ProvenanceDrawer } from './ProvenanceDrawer';
import { Term } from './Term';
import { useWorkings } from '../journey/workings';
import { settledLine } from '../journey/levers';
import {
  borrowingImprovement,
  currentBudgetImprovement,
  effectWords,
  laterStartYear,
  reliefWords,
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
      return `${sign}${abs} pp`;
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

function tone(v: number): string {
  return v > 0.5 ? 'amount--better' : v < -0.5 ? 'amount--worse' : '';
}

export { effectWords };

const POLICY_YEARS = policyYearsOf(vintage);
const IMPLEMENTATION_YEAR = vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? '';
const DEFLATOR = vintage.economy.gdpDeflator ? deflatorIndex(vintage) : null;

/** A manifesto red line this lever is watched by, and whether the current setting crosses it. */
export interface RedLine {
  promise: string;
  when: 'above' | 'below' | 'on';
  broken: boolean;
  /** Red (the promise's words) or amber (its spirit, Phase 23); red when unsaid. */
  severity?: 'breaks' | 'strains';
}

/** An option the player chose that this lever belongs to, and how it now stands (Phase 25). */
export interface Chosen {
  title: string;
  state: OptionState;
}

const RED_LINE_WORDS: Record<RedLine['when'], string> = {
  above: 'no rise',
  below: 'no cut',
  on: 'do not switch on',
};

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
            {r.severity === 'strains' ? 'Strains' : 'Breaks'} the manifesto: {r.promise}
          </span>
        ) : (
          <span key={`${r.severity ?? 'breaks'}-${r.promise}`} className="tag--manifesto">
            Manifesto: {r.severity === 'strains' ? 'contested' : RED_LINE_WORDS[r.when]}
            <span className="sr-only"> ({r.promise})</span>
          </span>
        ),
      )}
    </>
  );
}

export interface LevelChange {
  from: string;
  to: string;
  note?: string;
  /** Spending controls lead with real-terms growth; the cash budget sits beneath it. */
  real?: { from: string; to: string; note: string };
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
        };
      } catch {
        // No deflator for these years: the cash figures stand alone.
      }
    }
    return change;
  }
  return null;
}

/** Slider end labels: the level at each end when the lever has level metadata, else the change. */
function endLabel(lever: Lever, value: number): string {
  const level = lever.control.level;
  return level ? formatLevel(level, levelValue(level, value)) : formatLeverValue(lever, value);
}

function nearestOption(lever: Lever, value: number): string {
  const options = Object.keys(lever.control.labels ?? {}).map(Number);
  if (options.length === 0) return String(value);
  return String(
    options.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best)),
  );
}

/** A warning that applies now, beside a curated lever: another lever it interacts with has moved. */
export interface LeverNote {
  key: string;
  text: string;
  warn: boolean;
}

/** Another lever in the Budget counts the same money as this one (Phase 25): what it is, and why. */
export interface Blocked {
  /** What the other lever is called on this screen. */
  other: string;
  /** Untick a toggle; put a slider back. */
  untick: boolean;
  reason: string;
  onSwap?: () => void;
}

/** The plain line a relief cost carries on its card (Phase 25): no number of its own. */
export const RELIEF_LINE =
  'HMRC’s cost of the tax break. The real sum would be less, as people change what they do.';

export function LeverControl({
  lever,
  value,
  effect,
  summaryYear,
  onChange,
  redLines = [],
  chosen,
  displayTitle,
  hint,
  advice,
  notes = [],
  blocked,
  compact = false,
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
   * What the adviser's usual move would do, while the lever rests (Phase 24): the numbers in view
   * before anything moves. Once the lever has moved, the effect line takes its place.
   */
  hint?: { text: string; tone: 'better' | 'worse' | 'neutral' };
  /** One adviser's line on the lever (Phase 24). */
  advice?: { who: string; line: SimulatedLine };
  /** Warnings that apply now: a lever this one interacts with has moved. */
  notes?: readonly LeverNote[];
  /**
   * Another lever in the Budget counts the same money (Phase 25): the control stays reachable but
   * will not move, and says why and how to swap.
   */
  blocked?: Blocked;
  /**
   * The curated card (Phase 24): the lever's own headline, its milestones, the quieter tags and
   * what the number assumes wait under one fold, "More about this"; the surface is the control,
   * its price, the adviser's line and the tags that change what moving it means.
   */
  compact?: boolean;
  /** Anything to show beneath the lever: the minister's line, on a spending lever that has moved. */
  children?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const workings = useWorkings();
  const { min, max, step } = lever.control;
  const isToggle = lever.control.kind === 'toggle';
  const isSelect = lever.control.kind === 'select';
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
  const showHint = hint !== undefined && isDefault;
  // The control is described by the one-line headline and, once it has moved, by what it does;
  // on a curated card at rest, by what the usual move would do.
  const hasEffectLine =
    (improvement !== null && summaryYear !== undefined) ||
    (isFinancialTransaction && cashOut !== 0) ||
    showHint;
  const describedBy = [
    blocked ? `${id}-blocked` : null,
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
        : HMRC publishes estimates at {lookupPoints.join(', ')}; between them the game draws a
        straight line.
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
    isFinancialTransaction && cashOut !== 0 ? (
      <p className="lever__effect" id={`${id}-effect`}>
        Cash to borrow: {formatGbpBn(Math.abs(cashOut), 1)}
        <span className="lever__effect-note">
          {' '}
          · buying an asset is not spending, so borrowing and the debt rule barely move. The
          interest on the money is charged separately.
        </span>
      </p>
    ) : null;
  const effectLine =
    improvement !== null && summaryYear ? (
      <p className={`lever__effect ${tone(improvement)}`} id={`${id}-effect`}>
        {isCapital ? 'Borrowing' : 'Current budget'} in {summaryYear}:{' '}
        {laterStart && effect ? (
          <>
            nothing yet; from {laterStart} {words(improve(effect, laterStart))}
          </>
        ) : (
          words(improvement)
        )}
        {isCapital ? (
          <span className="lever__effect-note">
            {' '}
            · current budget unchanged: investment sits outside the stability rule
          </span>
        ) : null}
      </p>
    ) : null;
  const hintLine =
    showHint && hint ? (
      <p
        className={`lever__effect lever__hint${hint.tone === 'neutral' ? '' : ` amount--${hint.tone}`}`}
        id={`${id}-effect`}
      >
        {hint.text}
      </p>
    ) : null;
  // On the curated cards always; on the desk once the lever has moved, beside what it does.
  const reliefLine =
    relief && (compact || !isDefault) ? <p className="lever__relief">{RELIEF_LINE}</p> : null;
  const blockedLine = blocked ? (
    <BlockedNotice
      id={`${id}-blocked`}
      other={blocked.other}
      untick={blocked.untick}
      reason={blocked.reason}
      {...(blocked.onSwap ? { onSwap: blocked.onSwap } : {})}
    />
  ) : null;
  const adviceLine = advice ? <AdviceLine who={advice.who} line={advice.line} /> : null;
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
    workings || !isDefault ? (
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
        {!isDefault ? (
          <button type="button" className="linklike" onClick={() => change_(lever.control.default)}>
            Back to OBR
            <span className="sr-only"> for {lever.shortTitle}</span>
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={`lever${isToggle ? ' lever--toggle' : ''}${compact ? ' lever--curated' : ''}${blocked ? ' lever--blocked' : ''}`}
      role="group"
      aria-labelledby={`${id}-title`}
    >
      <div className="lever__head">
        {isToggle ? (
          <h3 className="lever__title" id={`${id}-title`}>
            <label htmlFor={id} className="lever__toggle-label">
              <input
                id={id}
                type="checkbox"
                checked={value === 1}
                aria-describedby={describedBy}
                aria-disabled={blocked ? true : undefined}
                onChange={(e) => change_(e.target.checked ? 1 : 0)}
              />
              {title}
            </label>
          </h3>
        ) : (
          <h3 className="lever__title" id={`${id}-title`}>
            <label htmlFor={id}>{title}</label>
          </h3>
        )}
        <span className="lever__flags">
          <LeverFlags redLines={redLines} chosen={chosen} />
          <LabelBadge badge={lever.badge} />
        </span>
      </div>
      {!isToggle ? (
        <>
          <div className="lever__value">
            {change ? (
              <>
                <span className="lever__level-from">{(change.real ?? change).from}</span>
                <span className="lever__arrow" aria-hidden="true">
                  {' → '}
                </span>
                <strong className="lever__level-to">{(change.real ?? change).to}</strong>
                {change.real ? (
                  <span className="lever__level-note"> {change.real.note}</span>
                ) : change.note ? (
                  <span className="lever__level-note"> {change.note}</span>
                ) : null}
                {change.real ? (
                  <span className="lever__cash">
                    {change.from} → {change.to} {change.note}
                  </span>
                ) : null}
                <span className="lever__delta">
                  {isDefault ? 'as the OBR forecast' : formatLeverValue(lever, value)}
                </span>
              </>
            ) : (
              <>
                <strong>
                  {isDefault ? 'As the OBR forecast' : formatLeverValue(lever, value)}
                </strong>
                {!isDefault && lever.control.formatLabel ? ` ${lever.control.formatLabel}` : ''}
              </>
            )}
          </div>
          {isSelect ? (
            <select
              id={id}
              className="lever__select"
              value={nearestOption(lever, value)}
              aria-describedby={describedBy}
              aria-disabled={blocked ? true : undefined}
              onChange={(e) => change_(Number(e.target.value))}
            >
              {Object.entries(lever.control.labels ?? {})
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
            </select>
          ) : (
            <>
              <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => change_(Number(e.target.value))}
                aria-describedby={describedBy}
                aria-disabled={blocked ? true : undefined}
                aria-valuetext={
                  change
                    ? `${change.to} (${formatLeverValue(lever, value)})`
                    : formatLeverValue(lever, value)
                }
              />
              <div className="lever__scale" aria-hidden="true">
                <span>{endLabel(lever, min)}</span>
                <span>{min < 0 && max > 0 ? 'OBR' : ''}</span>
                <span>{endLabel(lever, max)}</span>
              </div>
            </>
          )}
        </>
      ) : null}
      {compact ? (
        <>
          {blockedLine}
          {financialLine}
          {effectLine}
          {hintLine}
          {reliefLine}
          {adviceLine}
          {settledEl}
          {noteLines}
          {earliestTag ? <p className="lever__tags">{earliestTag}</p> : null}
          {children}
          <details className="more more--quiet lever__more">
            <summary>
              More about this<span className="sr-only">: {title}</span>
            </summary>
            <div className="more__body">
              {desc}
              {milestones}
              {notOnTheTableTag || commitmentTag || lookupTag || barnettTag ? (
                <p className="lever__tags">
                  {notOnTheTableTag}
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
        </>
      ) : (
        <>
          {desc}
          {milestones}
          {lookupPoints || barnett || commitment || notOnTheTable || earliest ? (
            <p className="lever__tags">
              {notOnTheTableTag}
              {earliestTag}
              {commitmentTag}
              {lookupTag}
              {barnettTag}
            </p>
          ) : null}
          {assumes.length > 0 ? (
            <details className="lever__assumes">
              <summary>What this assumes</summary>
              <ul>
                {assumes.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {blockedLine}
          {financialLine}
          {effectLine}
          {hintLine}
          {reliefLine}
          {adviceLine}
          {settledEl}
          {noteLines}
          {children}
        </>
      )}
      {actions}
      {open && workings ? <ProvenanceDrawer lever={lever} effect={effect} /> : null}
    </div>
  );
}
