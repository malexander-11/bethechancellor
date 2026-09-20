import type { ContextReading, Lever, LeverEffect } from '@btc/engine';
import { formatReading, suggestSetting } from '../journey/suggest';
import { LabelBadge } from './LabelBadge';
import { LeverControl, formatLeverValue } from './LeverControl';
import { SourceLink } from './SourceLink';

/**
 * One figure for a reading: the scalar, or the average over its years. The average is what the
 * advisers' gap rule compares, so the card and the suggestion agree.
 */
export function summariseReading(
  value: ContextReading['obr'],
  unit: ContextReading['unit'],
): string {
  if (value.value !== undefined) return formatReading(value.value, unit);
  const years = Object.values(value.series ?? {});
  if (years.length === 0) return '';
  const mean = years.reduce((a, b) => a + b, 0) / years.length;
  return formatReading(mean, unit, 1);
}

function isSeries(value: ContextReading['obr']): boolean {
  return value.series !== undefined;
}

/** The OBR's figure against the latest one, in one line. */
function Compare({ reading }: { reading: ContextReading }) {
  return (
    <div className="reading__compare">
      <span className="reading__side">
        <small>OBR in March{isSeries(reading.obr) ? ', average' : ''}</small>
        <strong>{summariseReading(reading.obr, reading.unit)}</strong>
      </span>
      <span className="reading__arrow" aria-hidden="true">
        →
      </span>
      <span className="reading__side">
        <small>Latest{isSeries(reading.latest) ? ', average' : ''}</small>
        <strong>{summariseReading(reading.latest, reading.unit)}</strong>
      </span>
    </div>
  );
}

function Why({ reading }: { reading: ContextReading }) {
  return (
    <details className="reading__why">
      <summary>Why this matters</summary>
      <p>{reading.text}</p>
      <div className="briefing__sources">
        <SourceLink ref={reading.obr.source} />
        <SourceLink ref={reading.latest.source} />
      </div>
      <p className="source">
        {reading.obr.label}. {reading.latest.label}.
      </p>
    </details>
  );
}

/** A reading that drives one of the economic sliders. */
export function AssumptionReading({
  reading,
  lever,
  value,
  effect,
  summaryYear,
  onChange,
}: {
  reading: ContextReading;
  lever: Lever;
  value: number;
  effect?: LeverEffect;
  summaryYear: string;
  onChange: (value: number) => void;
}) {
  const suggestion = suggestSetting(reading, lever);
  return (
    <article className="reading">
      <h3 className="reading__title">{reading.title}</h3>
      <Compare reading={reading} />
      {suggestion ? (
        <div className="reading__suggestion">
          <p>
            <LabelBadge badge="assumption" /> Advisers suggest{' '}
            <strong>{formatLeverValue(lever, suggestion.value)}</strong>
            {suggestion.value === lever.control.default ? ' (keep the OBR path)' : ''}
          </p>
          <details className="reading__rationale">
            <summary>Why this figure</summary>
            <p>{suggestion.rationale}</p>
          </details>
        </div>
      ) : null}
      <LeverControl
        lever={lever}
        value={value}
        effect={effect}
        summaryYear={summaryYear}
        onChange={onChange}
      />
      <Why reading={reading} />
    </article>
  );
}

/** A reading with no slider: context, shown as one row. */
export function ContextRow({ reading }: { reading: ContextReading }) {
  return (
    <tr>
      <th scope="row">{reading.title}</th>
      <td>{summariseReading(reading.obr, reading.unit)}</td>
      <td>{summariseReading(reading.latest, reading.unit)}</td>
      <td className="source">
        <SourceLink ref={reading.latest.source} />
      </td>
    </tr>
  );
}
