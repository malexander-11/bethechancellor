import type { ContextReading, Lever } from '@btc/engine';
import { formatReading, suggestSetting } from '../journey/suggest';
import { formatLeverValue } from './LeverControl';
import { SourceLink } from './SourceLink';

/**
 * One figure for a reading: the scalar, or the average over its years. The average is what the
 * advisers' gap rule compares, so the briefing and the estimate agree.
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

/** One reading, and the setting today's estimate takes from it (none for a context reading). */
export function EstimateRow({ reading, lever }: { reading: ContextReading; lever?: Lever }) {
  const s = lever ? suggestSetting(reading, lever) : null;
  const setting =
    lever && s
      ? `${formatLeverValue(lever, s.value)}${s.value === lever.control.default ? ' (the OBR’s path)' : ''}`
      : 'Context only';
  return (
    <tr>
      <th scope="row">{reading.title}</th>
      <td>{summariseReading(reading.obr, reading.unit)}</td>
      <td>{summariseReading(reading.latest, reading.unit)}</td>
      <td>{setting}</td>
      <td className="source">
        <SourceLink ref={reading.latest.source} />
      </td>
    </tr>
  );
}
