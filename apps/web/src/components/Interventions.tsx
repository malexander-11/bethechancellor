import type { Intervention } from '@btc/engine';
import { adviserById } from '../data';
import { Spoken } from './Conversation';

const MAX_SHOWN = 4;

/**
 * Advisers who remember. The lines an intervention fires are authored and badged; which of them
 * appear is decided by the package against what was promised in Downing Street.
 */
export function Interventions({ items }: { items: Intervention[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, MAX_SHOWN);
  return (
    <section className="interventions" aria-label="Your advisers">
      {shown.map((x) => (
        <Spoken
          key={`${x.id}-${x.about ?? ''}`}
          line={{ text: x.text, sources: x.sources, badge: x.badge }}
          who={adviserById.get(x.adviser)?.role ?? x.adviser}
          tone="adviser"
        />
      ))}
      {items.length > shown.length ? (
        <p className="panel__hint">
          {items.length - shown.length} more {items.length - shown.length === 1 ? 'note' : 'notes'}{' '}
          once these are dealt with.
        </p>
      ) : null}
    </section>
  );
}
