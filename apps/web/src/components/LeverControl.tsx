import type { Lever, LeverEffect } from '@btc/engine';
import { useId, useState } from 'react';
import { LabelBadge } from './LabelBadge';
import { ProvenanceDrawer } from './ProvenanceDrawer';

const MINUS = '−';

function formatValue(lever: Lever, value: number): string {
  const decimals = Math.max(0, (lever.control.step.toString().split('.')[1] ?? '').length);
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  const abs = Math.abs(value).toFixed(decimals);
  switch (lever.control.unit) {
    case 'pp':
      return `${sign}${abs} pp`;
    case 'GBP':
      return `${sign}£${abs}`;
    case 'GBPbn':
      return `${sign}£${abs}bn`;
    case 'pctRealPerYear':
      return `${sign}${abs}% a year`;
    default:
      return `${sign}${abs}`;
  }
}

export function LeverControl({
  lever,
  value,
  effect,
  onChange,
}: {
  lever: Lever;
  value: number;
  effect?: LeverEffect;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { min, max, step } = lever.control;
  const isDefault = value === lever.control.default;
  return (
    <div className="lever">
      <div className="lever__head">
        <label htmlFor={id} className="lever__title">
          {lever.title}
        </label>
        <LabelBadge badge={lever.badge} />
      </div>
      <div className="lever__value">
        <strong>{isDefault ? 'OBR assumption' : formatValue(lever, value)}</strong>
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
        aria-valuetext={formatValue(lever, value)}
      />
      <div className="lever__scale" aria-hidden="true">
        <span>{formatValue(lever, min)}</span>
        <span>OBR</span>
        <span>{formatValue(lever, max)}</span>
      </div>
      <p className="lever__desc">{lever.description}</p>
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
