/**
 * A meter showing headroom against the OBR's typical forecast error. The track spans
 * ±(typical error); a marker shows this budget, a hollow marker the OBR baseline.
 */
export function HeadroomGauge({
  headroomGbpm,
  baselineGbpm,
  typicalErrorGbpm,
}: {
  headroomGbpm: number;
  baselineGbpm: number;
  typicalErrorGbpm: number;
}) {
  const width = 320;
  const height = 34;
  const pad = 8;
  const span = Math.max(typicalErrorGbpm, Math.abs(headroomGbpm), Math.abs(baselineGbpm)) * 1.1;
  const x = (v: number) => pad + ((v + span) / (2 * span)) * (width - 2 * pad);
  const zero = x(0);
  const here = x(headroomGbpm);
  const base = x(baselineGbpm);
  const positive = headroomGbpm >= 0;
  return (
    <svg
      className="gauge"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Headroom of ${(headroomGbpm / 1000).toFixed(1)} billion pounds compared with a typical forecast error of ${(typicalErrorGbpm / 1000).toFixed(0)} billion`}
    >
      <rect
        x={x(-typicalErrorGbpm)}
        y={13}
        width={x(typicalErrorGbpm) - x(-typicalErrorGbpm)}
        height={8}
        rx={4}
        fill="var(--surface-2)"
        stroke="var(--grid)"
      />
      <rect
        x={Math.min(zero, here)}
        y={13}
        width={Math.max(2, Math.abs(here - zero))}
        height={8}
        rx={4}
        fill={positive ? 'var(--series-policy)' : 'var(--critical)'}
      />
      <line x1={zero} x2={zero} y1={8} y2={26} stroke="var(--axis)" strokeWidth={1} />
      <circle
        cx={base}
        cy={17}
        r={4.5}
        fill="var(--surface)"
        stroke="var(--series-baseline)"
        strokeWidth={2}
      />
      <circle
        cx={here}
        cy={17}
        r={5}
        fill={positive ? 'var(--series-policy)' : 'var(--critical)'}
        stroke="var(--surface)"
        strokeWidth={2}
      />
      <text x={x(-typicalErrorGbpm)} y={32} fontSize={9} fill="var(--muted)">
        −£{(typicalErrorGbpm / 1000).toFixed(0)}bn
      </text>
      <text x={x(typicalErrorGbpm)} y={32} fontSize={9} fill="var(--muted)" textAnchor="end">
        +£{(typicalErrorGbpm / 1000).toFixed(0)}bn
      </text>
      <text x={zero} y={6} fontSize={9} fill="var(--muted)" textAnchor="middle">
        0
      </text>
    </svg>
  );
}
