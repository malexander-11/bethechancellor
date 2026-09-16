import { ministerFor, ministerLine, type Lever } from '@btc/engine';
import { ministers } from '../data';
import { Spoken } from './Conversation';

/**
 * The minister on a folder. Untouched, they ask; cut, they say what stops happening; raised, they
 * make the case. A game judgement in a role's voice, with the facts inside it sourced.
 */
export function MinisterLine({ lever, value }: { lever: Lever; value: number }) {
  const minister = ministerFor(lever.code, ministers);
  if (!minister) return null;
  const say = ministerLine(minister, lever, value);
  return (
    <div className={`minister minister--${say.mood}`}>
      <Spoken line={say.line} who={minister.role} tone="minister" />
    </div>
  );
}
