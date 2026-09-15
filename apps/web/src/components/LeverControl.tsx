import { formatGbpBn, type Lever, type LeverEffect } from '@btc/engine';
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
            <strong>{isDefault ? 'As the OBR forecast' : formatLeverValue(lever, value)}</strong>
            {!isDefault && lever.control.formatLabel ? ` ${lever.control.formatLabel}` : ''}
          </div>
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuetext={formatLeverValue(lever, value)}
          />
          <div className="lever__scale" aria-hidden="true">
            <span>{formatLeverValue(lever, min)}</span>
            <span>{min < 0 && max > 0 ? 'OBR' : ''}</span>
            <span>{formatLeverValue(lever, max)}</span>
          </div>
        </>
      ) : null}
      <p className="lever__desc">{lever.description}</p>
      {lookupPoints ? (
        <p className="lever__note">
          HMRC publishes estimates at {lookupPoints.join(', ')}; values in between are interpolated
          in a straight line and the slider stops at HMRC&rsquo;s largest published change.
        </p>
      ) : null}
      {barnett ? (
        <p className="lever__note">
          Barnett formula: a change here would also move the block grants to Scotland, Wales and
          Northern Ireland in proportion. That knock-on is described in the sources, not counted in
          the number. <LabelBadge badge="commentary" />
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
          {open ? 'Hide sources' : 'Where does this number come from?'}
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
