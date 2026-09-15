import {
  formatGbpBn,
  fyStart,
  type Lever,
  type LeverEffect,
  type RawSource,
  type SourceRef,
} from '@btc/engine';
import { applicableConsiderations } from './considerations';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

const DIRECTION: Record<string, string> = {
  raisesLess: 'likely to raise less than the direct costing',
  raisesMore: 'likely to raise more than the direct costing',
  costsMore: 'likely to cost more than shown',
  costsLess: 'likely to cost less than shown',
  ambiguous: 'direction uncertain',
};

function rawSourceOf(lever: Lever): RawSource | undefined {
  const costing = lever.costing;
  if (costing.kind === 'pctOfBaseline') {
    return costing.baseline.from === 'published' ? costing.baseline.rawSource : undefined;
  }
  if (
    costing.kind === 'linearPerUnit' ||
    costing.kind === 'lookupTable' ||
    costing.kind === 'schedule'
  ) {
    return costing.rawSource;
  }
  return undefined;
}

function costingSourceOf(lever: Lever): SourceRef | undefined {
  return 'source' in lever.costing ? lever.costing.source : undefined;
}

function PublishedRows({ lever }: { lever: Lever }) {
  const raw = rawSourceOf(lever);
  if (!raw) return null;
  const source = costingSourceOf(lever);
  if (raw.kind === 'hmrcReadyReckoner') {
    return (
      <>
        <h4>
          Published figures <LabelBadge badge="direct" />
        </h4>
        <div className="table-scroll">
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
        </div>
        {source ? (
          <p>
            <SourceLink ref={source} />
          </p>
        ) : null}
        {raw.note ? <p className="source">{raw.note}</p> : null}
      </>
    );
  }
  if (raw.kind === 'hmrcReliefCost') {
    const years = [...new Set(raw.rows.flatMap((r) => Object.keys(r.values)))].sort();
    return (
      <>
        <h4>
          HMRC cost of the relief <LabelBadge badge="direct" />
        </h4>
        <div className="table-scroll">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Relief (£m, as published)</th>
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raw.rows.map((row) => (
                <tr key={row.rowId}>
                  <td>{row.name}</td>
                  {years.map((y) => (
                    <td key={y}>{(row.values[y] ?? 0).toLocaleString('en-GB')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {source ? (
          <p>
            <SourceLink ref={source} />
          </p>
        ) : null}
        {raw.note ? <p className="source">{raw.note}</p> : null}
      </>
    );
  }
  if (raw.kind === 'hmtSr25') {
    const years = [...new Set(raw.rows.flatMap((r) => Object.keys(r.values)))].sort();
    return (
      <>
        <h4>
          Spending Review 2025 rows <LabelBadge badge="direct" />
        </h4>
        <div className="table-scroll">
          <table className="detail-table">
            <thead>
              <tr>
                <th>{raw.sheet} (£bn, as published)</th>
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {raw.rows.map((row) => (
                <tr key={row.rowId}>
                  <td>
                    {row.role === 'subtract' ? <span className="source">less </span> : null}
                    {row.label}
                  </td>
                  {years.map((y) => {
                    const v = row.values[y];
                    return <td key={y}>{v === undefined ? '' : (v / 1000).toFixed(1)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {source ? (
          <p>
            <SourceLink ref={source} />
          </p>
        ) : null}
        {raw.note ? <p className="source">{raw.note}</p> : null}
      </>
    );
  }
  if (raw.kind === 'derivedFromPublished') {
    const method = raw.method;
    return (
      <>
        <h4>
          Our own arithmetic on published figures <LabelBadge badge="assumption" />
        </h4>
        {method.name === 'gdpShareGap' ? (
          <div className="table-scroll">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Share of GDP</th>
                  {Object.keys(method.baselinePctGdp)
                    .sort()
                    .map((y) => (
                      <th key={y}>{y}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Already in the forecast</td>
                  {Object.keys(method.baselinePctGdp)
                    .sort()
                    .map((y) => (
                      <td key={y}>{(method.baselinePctGdp[y] ?? 0).toFixed(2)}%</td>
                    ))}
                </tr>
                <tr>
                  <td>This policy</td>
                  {Object.keys(method.baselinePctGdp)
                    .sort()
                    .map((y) => (
                      <td key={y}>{method.targetPctGdp.toFixed(2)}%</td>
                    ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        {method.name === 'upratingGap' ? (
          <p>
            The {method.rowId.replace(/-/g, ' ')} line, uprated by{' '}
            {seriesName(method.replacementSeries)} instead of {seriesName(method.currentSeries)}{' '}
            from {method.baseYear}. The two paths compound, so the gap widens every year.
          </p>
        ) : null}
        {method.name === 'statedProduct' ? (
          <ul>
            {method.terms.map((t) => (
              <li key={t.label}>
                {t.label}: <strong>{t.value.toLocaleString('en-GB')}</strong> {t.unit}{' '}
                <SourceLink ref={t.source} />
              </li>
            ))}
            <li>
              Multiplied out: <strong>£{(method.resultGbpm / 1000).toFixed(1)}bn</strong> in{' '}
              {method.baseYear}
              {method.growWith ? ', then moving with the forecast for that line' : ', flat in cash'}
            </li>
          </ul>
        ) : null}
        {source ? (
          <p>
            <SourceLink ref={source} />
          </p>
        ) : null}
        <p className="source">{raw.note}</p>
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
      {source ? (
        <p>
          <SourceLink ref={source} />
        </p>
      ) : null}
      {raw.note ? <p className="source">{raw.note}</p> : null}
    </>
  );
}

const SERIES_NAMES: Record<string, string> = {
  tripleLockUprating: 'the triple lock',
  cpiInflationFy: 'CPI inflation',
  averageEarningsGrowth: 'average earnings',
};

function seriesName(key: string): string {
  return SERIES_NAMES[key] ?? key;
}

function Caveats({ caveats }: { caveats: string[] }) {
  if (caveats.length === 0) return null;
  return (
    <ul>
      {caveats.map((c) => (
        <li key={c} className="source">
          {c}
        </li>
      ))}
    </ul>
  );
}

function BaselineTable({ lever, effect }: { lever: Lever; effect: LeverEffect }) {
  const detail = effect.detail;
  if (!detail || lever.costing.kind !== 'pctOfBaseline') return null;
  const published = lever.costing.baseline.from === 'published';
  const years = Object.keys(detail.uprated).filter(
    (y) => detail.sourceYearFor[y] !== undefined && (detail.factor[y] ?? 0) !== 0,
  );
  const extendedFrom = detail.extendedFrom;
  const isExtended = (y: string) =>
    extendedFrom !== undefined && fyStart(y) >= fyStart(extendedFrom);
  const pct = (f: number) => `${f > 0 ? '+' : f < 0 ? '−' : ''}${Math.abs(f * 100).toFixed(1)}%`;
  return (
    <>
      <h4>
        From the baseline to this budget <LabelBadge badge="mechanical" />
      </h4>
      <div className="table-scroll">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>{published ? 'Spending Review plan' : 'OBR forecast line'}</th>
              <th>Change</th>
              <th>Used here</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y}>
                <td>{y}</td>
                <td>
                  {formatGbpBn(detail.baseline?.[y] ?? 0, 1)}
                  {isExtended(y) ? (
                    <span className="source"> (extended from {detail.sourceYearFor[y]})</span>
                  ) : null}
                </td>
                <td>× {pct(detail.factor[y] ?? 0)}</td>
                <td>
                  <strong>{formatGbpBn(detail.uprated[y] ?? 0, 2, true)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extendedFrom ? (
        <p className="source">
          From {extendedFrom} the Spending Review has no departmental plans, so the last settlement
          is carried forward with the OBR&rsquo;s total day-to-day spending path.{' '}
          <LabelBadge badge="assumption" />
        </p>
      ) : null}
      <Caveats caveats={detail.caveats} />
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
      <div className="table-scroll">
        <table className="detail-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>
                {isSchedule ? 'Scorecard line, engine sign' : 'Published figure (year taken)'}
              </th>
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
                  {!isSchedule ? (
                    <span className="source"> ({detail.sourceYearFor[y]})</span>
                  ) : null}
                </td>
                {!isSchedule ? <td>× {(detail.factor[y] ?? 1).toFixed(3)}</td> : null}
                <td>
                  <strong>{formatGbpBn(detail.uprated[y] ?? 0, 2, true)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caveats caveats={detail.caveats} />
    </>
  );
}

export function ProvenanceDrawer({ lever, effect }: { lever: Lever; effect?: LeverEffect }) {
  const considerations = applicableConsiderations(lever, effect?.value);
  return (
    <div className="drawer">
      <p className="drawer__lede">{lever.description}</p>
      {lever.costing.kind === 'lookupTable' ? (
        <p className="source">
          HMRC publishes estimates at its own points only; values in between are interpolated in a
          straight line and the control stops at the largest published change.
        </p>
      ) : null}
      {lever.classification?.barnettConsequential ? (
        <p className="source">
          Barnett formula: a change here would also move the block grants to Scotland, Wales and
          Northern Ireland in proportion. That knock-on is described below, not counted in the
          number.
        </p>
      ) : null}

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
          {lever.costing.kind === 'pctOfBaseline' ? (
            <BaselineTable lever={lever} effect={effect} />
          ) : (
            <UpratingTable lever={lever} effect={effect} />
          )}
        </>
      ) : (
        <p>Move the control to see the calculation for your setting.</p>
      )}

      {considerations.length > 0 ? (
        <>
          <h4>
            What the number leaves out <LabelBadge badge="commentary" />
          </h4>
          <ul>
            {considerations.map((c) => (
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
