import { useId, useState } from 'react';

interface PathChartProps {
  title: string;
  subtitle?: string;
  years: string[];
  baseline: number[];
  policy: number[];
  format: (value: number) => string;
  /** Formatter for axis ticks; defaults to `format`. Ticks usually want fewer decimals. */
  tickFormat?: (value: number) => string;
  highlightYear?: string;
  zeroLine?: boolean;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/**
 * Two-series line chart: OBR baseline (de-emphasised) against this budget (the series colour). 2px
 * lines, 8px end markers with a surface ring, hairline gridlines, direct end labels at 14px,
 * crosshair tooltip and a table view. Follows the dataviz "emphasis" form; the series colour is
 * for marks only, so every word on the chart is in ink.
 */
export function PathChart({
  title,
  subtitle,
  years,
  baseline,
  policy,
  format,
  highlightYear,
  zeroLine,
  tickFormat,
}: PathChartProps) {
  const formatTick = tickFormat ?? format;
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = 520;
  const height = 260;
  const margin = { top: 16, right: 100, bottom: 30, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const all = [...baseline, ...policy, ...(zeroLine ? [0] : [])];
  let min = Math.min(...all);
  let max = Math.max(...all);
  const padding = (max - min || 1) * 0.12;
  min -= padding;
  max += padding;
  const ticks = niceTicks(min, max);
  min = Math.min(min, ticks[0] ?? min);
  max = Math.max(max, ticks[ticks.length - 1] ?? max);

  const x = (i: number) =>
    margin.left + (years.length > 1 ? (i / (years.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => margin.top + innerH - ((v - min) / (max - min)) * innerH;
  const line = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = years.length - 1;
  const differs = policy.some((v, i) => Math.abs(v - (baseline[i] ?? v)) > 1e-9);
  const highlightIndex = highlightYear ? years.indexOf(highlightYear) : -1;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * innerW;
    const i = Math.round((px / innerW) * (years.length - 1));
    setHover(Math.max(0, Math.min(last, i)));
  }

  const hoverX = hover !== null ? x(hover) : 0;
  const tooltipLeft = hover !== null ? `${(hoverX / width) * 100}%` : '0';

  return (
    <div className="panel chart">
      <h3 className="chart__title" id={`${id}-title`}>
        {title}
      </h3>
      {subtitle ? <p className="chart__subtitle">{subtitle}</p> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-table`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={y(t) + 4}
              fontSize={14}
              fill="var(--ink-2)"
              textAnchor="end"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTick(t)}
            </text>
          </g>
        ))}
        {years.map((yr, i) => (
          <text
            key={yr}
            x={x(i)}
            y={height - 8}
            fontSize={14}
            fill={i === highlightIndex ? 'var(--ink)' : 'var(--ink-2)'}
            fontWeight={i === highlightIndex ? 600 : 400}
            textAnchor="middle"
          >
            {yr}
          </text>
        ))}
        {highlightIndex >= 0 ? (
          <rect
            x={x(highlightIndex) - 14}
            y={margin.top}
            width={28}
            height={innerH}
            fill="var(--series-policy-wash)"
          />
        ) : null}
        <path
          d={line(baseline)}
          fill="none"
          stroke="var(--series-baseline)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {differs ? (
          <path
            d={line(policy)}
            fill="none"
            stroke="var(--series-policy)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <circle
          cx={x(last)}
          cy={y(baseline[last] ?? 0)}
          r={4}
          fill="var(--series-baseline)"
          stroke="var(--surface)"
          strokeWidth={2}
        />
        {differs ? (
          <circle
            cx={x(last)}
            cy={y(policy[last] ?? 0)}
            r={4}
            fill="var(--series-policy)"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ) : null}
        <text
          x={x(last) + 9}
          y={
            y(baseline[last] ?? 0) +
            (differs && (policy[last] ?? 0) > (baseline[last] ?? 0) ? 12 : -6)
          }
          fontSize={14}
          fill="var(--ink-2)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {format(baseline[last] ?? 0)}
          {differs ? ' OBR' : ''}
        </text>
        {differs ? (
          <text
            x={x(last) + 9}
            y={y(policy[last] ?? 0) + ((policy[last] ?? 0) > (baseline[last] ?? 0) ? -6 : 12)}
            fontSize={14}
            fontWeight={600}
            fill="var(--ink)"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {format(policy[last] ?? 0)}
          </text>
        ) : null}
        {hover !== null ? (
          <g>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={margin.top}
              y2={margin.top + innerH}
              stroke="var(--axis)"
              strokeWidth={1}
            />
            <circle
              cx={hoverX}
              cy={y(baseline[hover] ?? 0)}
              r={4}
              fill="var(--series-baseline)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
            {differs ? (
              <circle
                cx={hoverX}
                cy={y(policy[hover] ?? 0)}
                r={4}
                fill="var(--series-policy)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ) : null}
          </g>
        ) : null}
        <rect
          className="chart__hit"
          x={margin.left}
          y={margin.top}
          width={innerW}
          height={innerH}
          fill="none"
          style={{ pointerEvents: 'all' }}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null ? (
        <div
          className="tooltip"
          style={{
            left: tooltipLeft,
            top: 40,
            transform: hover > last / 2 ? 'translateX(-105%)' : 'translateX(12px)',
          }}
        >
          <div className="tooltip__year">{years[hover]}</div>
          {differs ? (
            <div className="tooltip__row">
              <span>
                <span className="tooltip__key" style={{ color: 'var(--series-policy)' }} />
                Your budget
              </span>
              <b>{format(policy[hover] ?? 0)}</b>
            </div>
          ) : null}
          <div className="tooltip__row">
            <span>
              <span className="tooltip__key" style={{ color: 'var(--series-baseline)' }} />
              OBR March 2026
            </span>
            <b>{format(baseline[hover] ?? 0)}</b>
          </div>
        </div>
      ) : null}
      <p className="chart__legend" aria-hidden="true">
        {differs ? (
          <span className="legend-policy">
            <b>Your budget</b>
          </span>
        ) : null}
        <span className="legend-baseline">
          <b>OBR March 2026</b>
        </span>
      </p>
      <details className="table-view" id={`${id}-table`}>
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>OBR March 2026</th>
              {differs ? <th>Your budget</th> : null}
            </tr>
          </thead>
          <tbody>
            {years.map((yr, i) => (
              <tr key={yr}>
                <td>{yr}</td>
                <td>{format(baseline[i] ?? 0)}</td>
                {differs ? <td>{format(policy[i] ?? 0)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
