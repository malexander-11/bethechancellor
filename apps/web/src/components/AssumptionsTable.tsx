import type { ContextReading, Lever, LeverEffect } from '@btc/engine';
import { formatReading, suggestSetting } from '../journey/suggest';
import { LabelBadge } from './LabelBadge';
import { LeverControl, formatLeverValue } from './LeverControl';
import { SourceLink } from './SourceLink';

function Reading({ value, unit }: { value: ContextReading['obr']; unit: ContextReading['unit'] }) {
  if (value.value !== undefined) {
    return <strong className="reading__value">{formatReading(value.value, unit)}</strong>;
  }
  const years = Object.keys(value.series ?? {});
  return (
    <span className="reading__series">
      {years.map((y) => (
        <span key={y} className="reading__year">
          <small>{y}</small> {formatReading(value.series?.[y] ?? 0, unit, 1)}
        </span>
      ))}
    </span>
  );
}

/**
 * One reading from the context file: the OBR's March assumption against the latest figure, the
 * advisers' suggested setting, and the slider that applies it (for readings that drive a lever).
 */
export function AssumptionReading({
  reading,
  lever,
  value,
  effect,
  summaryYear,
  onChange,
}: {
  reading: ContextReading;
  lever?: Lever;
  value?: number;
  effect?: LeverEffect;
  summaryYear: string;
  onChange?: (value: number) => void;
}) {
  const suggestion = lever ? suggestSetting(reading, lever) : null;
  return (
    <article className="reading">
      <h3 className="reading__title">{reading.title}</h3>
      <div className="reading__grid">
        <div>
          <div className="reading__label">OBR in March</div>
          <Reading value={reading.obr} unit={reading.unit} />
          <div className="source">
            {reading.obr.label} · <SourceLink ref={reading.obr.source} />
          </div>
        </div>
        <div>
          <div className="reading__label">Latest</div>
          <Reading value={reading.latest} unit={reading.unit} />
          <div className="source">
            {reading.latest.label} · <SourceLink ref={reading.latest.source} />
          </div>
        </div>
      </div>
      <p className="reading__text">{reading.text}</p>
      {lever && suggestion ? (
        <p className="reading__suggestion">
          <LabelBadge badge="assumption" /> Advisers suggest{' '}
          <strong>{formatLeverValue(lever, suggestion.value)}</strong>
          {suggestion.value === lever.control.default ? ' (keep the OBR path)' : ''}.{' '}
          <span className="source">{suggestion.rationale}</span>
        </p>
      ) : null}
      {lever && value !== undefined && onChange ? (
        <LeverControl
          lever={lever}
          value={value}
          effect={effect}
          summaryYear={summaryYear}
          onChange={onChange}
        />
      ) : null}
    </article>
  );
}
