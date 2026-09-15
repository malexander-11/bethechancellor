import type { Consideration, Lever, Outcome } from '@btc/engine';
import { adviserById } from '../data';
import { applicableConsiderations } from './considerations';
import { LabelBadge } from './LabelBadge';
import { SourceLink } from './SourceLink';

interface Note {
  lever: Lever;
  consideration: Consideration;
}

/** Which adviser speaks to a consideration: by its kind, and by the lever's side for behavioural notes. */
export function adviserFor(kind: Consideration['kind'], lever: Lever): string {
  switch (kind) {
    case 'behavioural':
    case 'interaction':
      return lever.category === 'tax' ? 'director-of-tax' : 'director-of-public-spending';
    case 'macro':
    case 'market':
      return 'chief-economic-adviser';
    case 'administrative':
      return 'permanent-secretary';
    case 'distributional':
    case 'devolution':
    case 'legal':
      return 'political-adviser';
  }
}

/**
 * The advisers' closing notes: the authored considerations of every lever the player moved,
 * grouped by the adviser whose remit they fall under. No text is generated.
 */
export function ClosingNotes({ outcome, levers }: { outcome: Outcome; levers: readonly Lever[] }) {
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const notes = new Map<string, Note[]>();
  for (const effect of outcome.leverEffects) {
    if (effect.category === 'macro') continue;
    const lever = byCode.get(effect.code);
    if (!lever) continue;
    for (const consideration of applicableConsiderations(lever, effect.value)) {
      const adviser = adviserFor(consideration.kind, lever);
      const list = notes.get(adviser) ?? [];
      list.push({ lever, consideration });
      notes.set(adviser, list);
    }
  }
  if (notes.size === 0) {
    return (
      <p className="panel__hint">Move a tax or spending lever and the advisers will comment.</p>
    );
  }
  const order = [
    'political-adviser',
    'director-of-tax',
    'director-of-public-spending',
    'chief-economic-adviser',
    'permanent-secretary',
  ];
  return (
    <div className="notes">
      {order
        .filter((id) => notes.has(id))
        .map((id) => (
          <section key={id} className="notes__adviser">
            <h3 className="notes__role">
              {adviserById.get(id)?.role ?? id} <LabelBadge badge="commentary" />
            </h3>
            <ul>
              {(notes.get(id) ?? []).map(({ lever, consideration }) => (
                <li key={`${lever.code}-${consideration.id}`}>
                  <strong>{lever.shortTitle}.</strong> {consideration.text}
                  <div className="briefing__sources">
                    {consideration.sources.map((s, i) => (
                      <SourceLink key={i} ref={s} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
