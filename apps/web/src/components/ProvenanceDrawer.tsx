import type { Lever, LeverEffect } from '@btc/engine';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

const DIRECTION: Record<string, string> = {
  raisesLess: 'likely to raise less than the direct costing',
  raisesMore: 'likely to raise more than the direct costing',
  costsMore: 'likely to cost more than shown',
  costsLess: 'likely to cost less than shown',
  ambiguous: 'direction uncertain',
};

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

      <h4>
        How this number is worked out <LabelBadge badge={lever.badge} />
      </h4>
      {effect ? (
        <ul>
          {effect.steps.map((step, i) => (
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
      ) : (
        <p>Move the slider to see the calculation for your setting.</p>
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
                  {c.magnitudeWords ? `, ${c.magnitudeWords} effect` : ''}:{' '}
                  {DIRECTION[c.direction] ?? c.direction}.
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
