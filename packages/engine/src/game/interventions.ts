import type {
  InterventionsFile,
  InterventionWhen,
  SimulatedLine,
  SourceRef,
} from '../types/data.js';
import type { AmbitionStatus } from './ambitions.js';

/**
 * Advisers who remember. An intervention is an authored line with a predicate over the ambition
 * status and the scorecard; when the predicate holds, the adviser says it. `{name}` is filled
 * with the title of the promise or flagship concerned, and the sources of that promise or
 * flagship travel with the line, so the player can check what the adviser is holding them to.
 */

export interface Intervention {
  id: string;
  adviser: string;
  when: InterventionWhen;
  /** The line with `{name}` filled in. */
  text: string;
  /** The line's own sources plus those of what it is about. */
  sources: SourceRef[];
  /** The promise or flagship id the predicate fired on, when it fired on one. */
  about?: string;
  badge: SimulatedLine['badge'];
}

export interface DeskReading {
  /** Stability-rule headroom in the target year, £ million. */
  headroomGbpm: number;
  /** The margin the player set out to keep, £ million; nought means whatever the rules leave. */
  targetGbpm: number;
  /** Any rule missed, or the welfare cap above its margin. */
  ruleMissed: boolean;
}

/** Most pressing first: a broken promise outranks a compliment. */
const ORDER: readonly InterventionWhen[] = [
  'promise-broken',
  'rule-missed',
  'priority-unfunded',
  'headroom-below-target',
  'priority-part-funded',
  'all-priorities-funded',
  'headroom-above-target',
];

export function interventionsFor(
  file: InterventionsFile,
  status: AmbitionStatus,
  reading: DeskReading,
): Intervention[] {
  const out: Intervention[] = [];
  const say = (
    when: InterventionWhen,
    name: string | undefined,
    about: string | undefined,
    sources: readonly SourceRef[],
  ) => {
    for (const spec of file.interventions) {
      if (spec.when !== when) continue;
      out.push({
        id: spec.id,
        adviser: spec.adviser,
        when,
        text: spec.line.text.replace(/\{name\}/g, name ?? ''),
        sources: [...spec.line.sources, ...sources],
        about,
        badge: spec.line.badge,
      });
    }
  };
  for (const p of status.promises) {
    if (!p.kept) say('promise-broken', p.promise.title, p.promise.id, p.promise.sources);
  }
  if (reading.ruleMissed) say('rule-missed', undefined, undefined, []);
  for (const p of status.priorities) {
    if (p.status === 'unfunded') {
      say('priority-unfunded', p.flagship.title, p.flagship.id, p.flagship.sources);
    } else if (p.status === 'part-funded') {
      say('priority-part-funded', p.flagship.title, p.flagship.id, p.flagship.sources);
    }
  }
  if (status.priorities.length > 0 && status.funded === status.priorities.length) {
    say('all-priorities-funded', undefined, undefined, []);
  }
  if (reading.targetGbpm > 0) {
    if (reading.headroomGbpm < reading.targetGbpm) {
      say('headroom-below-target', undefined, undefined, []);
    } else {
      say('headroom-above-target', undefined, undefined, []);
    }
  }
  return out.sort((a, b) => ORDER.indexOf(a.when) - ORDER.indexOf(b.when));
}
