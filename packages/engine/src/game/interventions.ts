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
 * with the title of the promise or priority concerned, and the sources of that promise or
 * priority travel with the line, so the player can check what the adviser is holding them to.
 */

export interface Intervention {
  id: string;
  adviser: string;
  when: InterventionWhen;
  /** The line with `{name}` filled in. */
  text: string;
  /** The line's short form with `{name}` filled in, when it has one. */
  short?: string;
  /** The line's own sources plus those of what it is about. */
  sources: SourceRef[];
  /** The promise or priority id the predicate fired on. */
  about: string;
  badge: SimulatedLine['badge'];
}

/**
 * Most pressing first: a broken promise outranks a strain. The fiscal rules are the bar's to say,
 * and a Budget that funds every priority needs no line: the Permanent Secretary said both until the
 * user asked for their advice to go.
 */
const ORDER: readonly InterventionWhen[] = [
  'promise-broken',
  'commitment-broken',
  'priority-unfunded',
  'promise-strained',
  'priority-part-funded',
];

export function interventionsFor(file: InterventionsFile, status: AmbitionStatus): Intervention[] {
  const out: Intervention[] = [];
  const say = (
    when: InterventionWhen,
    name: string,
    about: string,
    sources: readonly SourceRef[],
  ) => {
    for (const spec of file.interventions) {
      if (spec.when !== when) continue;
      const fill = (s: string) => s.replace(/\{name\}/g, name);
      out.push({
        id: spec.id,
        adviser: spec.adviser,
        when,
        text: fill(spec.line.text),
        ...(spec.line.short ? { short: fill(spec.line.short) } : {}),
        sources: [...spec.line.sources, ...sources],
        about,
        badge: spec.line.badge,
      });
    }
  };
  const brokenIds = new Set(status.promises.filter((p) => !p.kept).map((p) => p.promise.id));
  // A manifesto red line and a reversed commitment get their own lines (Phase 25). A promise the
  // fiscal rules judge is left to the bar.
  for (const p of status.promises) {
    if (p.kept || p.promise.judgedBy === 'fiscalRules') continue;
    const when = p.promise.origin === 'manifesto-2024' ? 'promise-broken' : 'commitment-broken';
    say(when, p.promise.title, p.promise.id, p.promise.sources);
  }
  // Amber (Phase 23): a promise strained and not broken gets its own, quieter line, where the
  // strain is scored; a strain shown for information only is left to its amber tag (Phase 25).
  for (const s of status.strains) {
    if (!s.strained || brokenIds.has(s.promise.id)) continue;
    const scored = s.promise.strains.some(
      (rule) => rule.scored && s.strainedBy.some((b) => b.code === rule.code),
    );
    if (scored) say('promise-strained', s.promise.title, s.promise.id, s.promise.sources);
  }
  for (const p of status.priorities) {
    if (p.status === 'notFunded') {
      say('priority-unfunded', p.priority.title, p.priority.id, p.priority.sources);
    } else if (p.status === 'settledLower' || p.status === 'started') {
      say('priority-part-funded', p.priority.title, p.priority.id, p.priority.sources);
    }
  }
  return out.sort((a, b) => ORDER.indexOf(a.when) - ORDER.indexOf(b.when));
}
