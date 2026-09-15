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
  type YearValues,
} from '@btc/engine';
import { vintage } from '../data';
import { Milestones } from './Milestones';
import { useId, useState } from 'react';
import { LabelBadge } from './LabelBadge';
import { ProvenanceDrawer } from './ProvenanceDrawer';

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

/** Effect on the current budget in a year: receipts up or spending down improves it. Positive = better. */
function currentBudgetImprovement(effect: LeverEffect, year: string): number {
  return (
    (effect.receipts[year] ?? 0) -
    (effect.currentSpending[year] ?? 0) -
    (effect.macroCurrent[year] ?? 0)
  );
}

/** Effect on total borrowing in a year, investment included. Positive = less borrowing. */
function borrowingImprovement(effect: LeverEffect, year: string): number {
  return (
    (effect.receipts[year] ?? 0) -
    (effect.currentSpending[year] ?? 0) -
    (effect.capitalSpending[year] ?? 0) -
    (effect.macroPsnb[year] ?? 0)
  );
}

function tone(v: number): string {
  return v > 0.5 ? 'amount--better' : v < -0.5 ? 'amount--worse' : '';
}

const POLICY_YEARS = policyYearsOf(vintage);
const IMPLEMENTATION_YEAR = vintage.years.forecast[1] ?? vintage.years.forecast[0] ?? '';
const DEFLATOR = vintage.economy.gdpDeflator ? deflatorIndex(vintage) : null;

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
    // Real growth runs from the last year your Budget cannot touch to the year shown above.
    const fromYear = POLICY_YEARS.filter((y) => fyStart(y) < fyStart(IMPLEMENTATION_YEAR)).at(-1);
    if (DEFLATOR && fromYear && fyStart(year) > fyStart(fromYear)) {
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

export function LeverControl({
  lever,
  value,
  effect,
  summaryYear,
  onChange,
}: {
  lever: Lever;
  value: number;
  effect?: LeverEffect;
  summaryYear?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { min, max, step } = lever.control;
  const isToggle = lever.control.kind === 'toggle';
  const isSelect = lever.control.kind === 'select';
  const change = !isToggle ? levelChange(lever, value, summaryYear) : null;
  const isCapital = lever.classification?.currentOrCapital === 'capital';
  const barnett = lever.classification?.barnettConsequential === true;
  const isDefault = value === lever.control.default;
  const improvement =
    effect && summaryYear
      ? isCapital
        ? borrowingImprovement(effect, summaryYear)
        : currentBudgetImprovement(effect, summaryYear)
      : null;
  const lookupPoints =
    lever.costing.kind === 'lookupTable'
      ? lever.costing.points
          .map((p) => p.input)
          .filter((p) => p !== 0)
          .map((p) => formatLeverValue(lever, p))
      : null;
  return (
    <div className={`lever${isToggle ? ' lever--toggle' : ''}`}>
      <div className="lever__head">
        {isToggle ? (
          <label htmlFor={id} className="lever__title lever__toggle-label">
            <input
              id={id}
              type="checkbox"
              checked={value === 1}
              onChange={(e) => onChange(e.target.checked ? 1 : 0)}
            />
            {lever.title}
          </label>
        ) : (
          <label htmlFor={id} className="lever__title">
            {lever.title}
          </label>
        )}
        <LabelBadge badge={lever.badge} />
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
              onChange={(e) => onChange(Number(e.target.value))}
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
                onChange={(e) => onChange(Number(e.target.value))}
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
      <p className="lever__desc">{lever.headline ?? lever.description}</p>
      {lever.milestones?.length ? <Milestones milestones={lever.milestones} /> : null}
      {lookupPoints || barnett ? (
        <p className="lever__tags">
          {lookupPoints ? (
            <span
              className="tag"
              title={`HMRC publishes estimates at ${lookupPoints.join(', ')}; values in between are interpolated in a straight line.`}
            >
              HMRC points only
            </span>
          ) : null}
          {barnett ? (
            <span
              className="tag"
              title="A change here also moves the Scottish, Welsh and Northern Ireland block grants. That knock-on is described in the sources, not counted in the number."
            >
              Barnett applies
            </span>
          ) : null}
        </p>
      ) : null}
      {improvement !== null && summaryYear ? (
        <p className={`lever__effect ${tone(improvement)}`}>
          {isCapital ? 'Borrowing' : 'Current budget'} in {summaryYear}:{' '}
          {formatGbpBn(improvement, 1, true)}
          {isCapital ? (
            <span className="lever__effect-note">
              {' '}
              · current budget unchanged: investment sits outside the stability rule
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="lever__actions">
        <button
          type="button"
          className="linklike"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'Hide detail' : 'Detail and sources'}
        </button>
        {!isDefault ? (
          <button
            type="button"
            className="linklike"
            onClick={() => onChange(lever.control.default)}
          >
            Back to OBR
          </button>
        ) : null}
      </div>
      {open ? <ProvenanceDrawer lever={lever} effect={effect} /> : null}
    </div>
  );
}
