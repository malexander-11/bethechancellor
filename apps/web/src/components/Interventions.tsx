import type { Intervention } from '@btc/engine';
import { adviserById } from '../data';
import { Spoken } from './Conversation';

/**
 * Advisers who remember. The lines an intervention fires are authored in data; which of them
 * appear is decided by the package against what was promised in Downing Street. One voice speaks
 * on the surface, the most pressing; the rest wait behind one fold, so no screen reads as a chorus.
 */
export function Interventions({ items }: { items: Intervention[] }) {
  const [first, ...rest] = items;
  if (!first) return null;
  return (
    <section className="interventions" aria-label="Your advisers">
      <Note item={first} />
      {rest.length > 0 ? (
        <details className="more more--quiet interventions__more">
          <summary>What the advisers say ({rest.length} more)</summary>
          <div className="more__body">
            {rest.map((x) => (
              <Note key={`${x.id}-${x.about}`} item={x} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function Note({ item }: { item: Intervention }) {
  return (
    <Spoken
      line={{
        text: item.text,
        ...(item.short ? { short: item.short } : {}),
        sources: item.sources,
        badge: item.badge,
      }}
      who={adviserById.get(item.adviser)?.role ?? item.adviser}
      tone="adviser"
    />
  );
}
