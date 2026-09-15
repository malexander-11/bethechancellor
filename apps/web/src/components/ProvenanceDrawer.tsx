import { formatGbpBn, type Lever, type LeverEffect } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

const DIRECTION: Record<string, string> = {
  raisesLess: 'likely to raise less than the direct costing',
  raisesMore: 'likely to raise more than the direct costing',
  costsMore: 'likely to cost more than shown',
  costsLess: 'likely to cost less than shown',
  ambiguous: 'direction uncertain',
};

function PublishedRows({ lever }: { lever: Lever }) {
  const costing = lever.costing;
  if (
    costing.kind !== 'linearPerUnit' &&
    costing.kind !== 'lookupTable' &&
    costing.kind !== 'schedule'
  )
    return null;
  const raw = costing.rawSource;
  if (!raw) return null;
  if (raw.kind === 'hmrcReadyReckoner') {
    return (
      <>
        <h4>
          Published figures <LabelBadge badge="direct" />
        </h4>
        <table className="detail-table">
          <thead>
            <tr>
              <th>HMRC row (£m, as published)</th>
              {raw.years.map((y) => (
                <th key={y}>{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {raw.rows.map((row) => (
              <tr key={row.rowId}>
                <td>
                  {row.label}
                  <span className="source"> ({row.hmrcSign})</span>
                </td>
                {raw.years.map((y) => (
                  <td key={y}>{(row.values[y] ?? 0).toLocaleString('en-GB')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <SourceLink ref={costing.source} />
        </p>
        {raw.note ? <p className="source">{raw.note}</p> : null}
      </>
    );
  }
  return (
    <>
      <h4>
        Treasury scorecard lines <LabelBadge badge="direct" />
      </h4>
      <ul>
        {raw.lines.map((line) => (
          <li key={line.number}>
            <strong>Line {line.number}.</strong> {line.title}
            <div className="source">
              {Object.entries(line.values)
                .map(([y, v]) => `${y}: ${v.toLocaleString('en-GB')}`)
                .join(' · ')}{' '}
              (£m; positive reduces borrowing)
            </div>
          </li>
        ))}
      </ul>
      <p>
        <SourceLink ref={costing.source} />
      </p>
      {raw.note ? <p className="source">{raw.note}</p> : null}
    </>
  );
}

function UpratingTable({ lever, effect }: { lever: Lever; effect: LeverEffect }) {
  const detail = effect.detail;
  if (!detail) return null;
  const years = Object.keys(detail.uprated).filter((y) => detail.sourceYearFor[y] !== undefined);
  const isSchedule = lever.costing.kind === 'schedule';
  return (
    <>
      <h4>
        From the published figure to this budget{' '}
        <LabelBadge badge={isSchedule ? 'direct' : 'assumption'} />
      </h4>
      <table className="detail-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>{isSchedule ? 'Scorecard (sign reversed)' : 'Published figure (year taken)'}</th>
            {!isSchedule ? <th>Uprating factor</th> : null}
            <th>Used here</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <td>{y}</td>
              <td>
                {formatGbpBn(detail.raw[y] ?? 0, 2, true)}
                {!isSchedule ? <span className="source"> ({detail.sourceYearFor[y]})</span> : null}
              </td>
              {!isSchedule ? <td>× {(detail.factor[y] ?? 1).toFixed(3)}</td> : null}
              <td>
                <strong>{formatGbpBn(detail.uprated[y] ?? 0, 2, true)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {detail.caveats.length > 0 ? (
        <ul>
          {detail.caveats.map((c) => (
            <li key={c} className="source">
              {c}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function ProvenanceDrawer({ lever, effect }: { lever: Lever; effect?: LeverEffect }) {
  return (
    <div className="drawer">
      <h4>What the OBR baseline already assumes</h4>
      <p>{lever.baselinePolicy.text}</p>
      <p>
        <SourceLink ref={lever.baselinePolicy.source} />
      </p>
      {lever.baselinePolicy.alreadyIncludes?.length ? (
        <ul>
          {lever.baselinePolicy.alreadyIncludes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <PublishedRows lever={lever} />

      <h4>
        How this number is worked out <LabelBadge badge={lever.badge} />
      </h4>
      {effect ? (
        <>
          <ul>
            {effect.steps
              .filter((step) => step.op !== 'scale' && step.op !== 'extend')
              .map((step, i) => (
                <li key={i}>
                  {step.formula}
                  {step.note ? <div className="source">{step.note}</div> : null}
                  {step.source ? (
                    <div>
                      <SourceLink ref={step.source} />
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
          <UpratingTable lever={lever} effect={effect} />
        </>
      ) : (
        <p>Move the control to see the calculation for your setting.</p>
      )}

      {lever.considerations.length > 0 ? (
        <>
          <h4>
            What the number leaves out <LabelBadge badge="commentary" />
          </h4>
          <ul>
            {lever.considerations.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.kind.charAt(0).toUpperCase() + c.kind.slice(1)}</strong>
                  {c.magnitudeWords && c.magnitudeWords !== 'unknown'
                    ? `, ${c.magnitudeWords} effect`
                    : ''}
                  : {DIRECTION[c.direction] ?? c.direction}
                  {c.alreadyInDirectCosting ? ' (already inside the published figure)' : ''}.
                </div>
                <div>{c.text}</div>
                {c.sources.map((s, i) => (
                  <div key={i}>
                    <SourceLink ref={s} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
