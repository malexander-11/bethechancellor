import type { Lever, PmFile, SimulatedLine } from '../types/data.js';
import type { Outcome } from '../types/engine.js';
import { isMissed } from '../rules/words.js';
import type { AmbitionStatus } from './ambitions.js';
import type { OutcomeOf } from './prices.js';
import type { Reason, Reception } from './reception.js';
import { headroomWithoutBreak } from './verdict.js';
import { inWords } from './words.js';

/**
 * The sign-off (Phase 25, R14): before the Budget is delivered, the Prime Minister has a word on
 * the review, and one of the reactions already in train is read out, with no rating. Both are
 * judgements from data, badged as such; neither makes a figure of its own.
 */

export type SignOffKey = 'rulesMissed' | 'brokenWithRoom' | 'broken' | 'strained';

export interface SignOff {
  key: SignOffKey;
  /** The line with `{rules}` or `{promises}` filled in. */
  line: SimulatedLine;
  /** The promises the line names, so the review does not tag them a second time. */
  names: string[];
}

export interface SignOffInput {
  pm: PmFile;
  outcome: Outcome;
  status: AmbitionStatus;
  levers: readonly Lever[];
  outcomeOf: OutcomeOf;
}

/**
 * The Prime Minister's one line, by first match: a fiscal rule missed; a promise broken when the
 * rules would still hold without it ("with room to spare", worked out by putting the breaking
 * levers back); a promise broken; a promise strained, where the strain is scored. Nothing when
 * all is well. A priority left unfunded is not the PM's line here: the review already says it
 * under the priority.
 */
export function signOffLine(input: SignOffInput): SignOff | null {
  const { pm, outcome, status } = input;
  const fill = (key: SignOffKey, words: Record<string, string>, names: string[]): SignOff => {
    const line = pm.signOff[key];
    return {
      key,
      line: { ...line, text: line.text.replace(/\{(\w+)\}/g, (_, k: string) => words[k] ?? '') },
      names,
    };
  };
  const missed = outcome.verdicts.filter((v) => isMissed(v) && v.kind !== 'welfareCap');
  if (missed.length > 0)
    return fill('rulesMissed', { rules: inWords(missed.map((v) => v.shortName)) }, []);
  const broken = status.promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
  if (broken.length > 0) {
    const promises = inWords(broken.map((p) => p.promise.noun));
    const ids = broken.map((p) => p.promise.id);
    return headroomWithoutBreak(input) === undefined
      ? fill('broken', { promises }, ids)
      : fill('brokenWithRoom', { promises }, ids);
  }
  // A strain shown for information only keeps its amber tag; the PM names a scored one.
  const strained = status.strains.filter(
    (s) =>
      s.strained &&
      s.promise.strains.some(
        (rule) => rule.scored && s.strainedBy.some((b) => b.code === rule.code),
      ),
  );
  if (strained.length > 0) {
    return fill(
      'strained',
      { promises: inWords(strained.map((s) => s.promise.noun)) },
      strained.map((s) => s.promise.id),
    );
  }
  return null;
}

/**
 * The reactions the review may read out (Phase 25): who pays, the tax rises people feel, the cuts
 * they notice and the tax cuts they welcome. Each is a band already triggered on Budget day.
 */
export const PREVIEW_RULES = [
  'pb-tax-rises',
  'bb-who-pays',
  'pb-service-cuts',
  'bb-welfare-cut',
  'pb-tax-cuts',
] as const;

/**
 * One reaction already in train, for the review (Phase 25): of the bands in PREVIEW_RULES that
 * move a rating, the one that moves it most, read out in its own words with no rating beside it.
 * Nothing when none of them moves anything.
 */
export function reactionPreview(
  rooms: readonly Reception[],
): { audience: string; reason: Reason } | null {
  const order = (rule: string) => PREVIEW_RULES.indexOf(rule as (typeof PREVIEW_RULES)[number]);
  const found = rooms
    .flatMap((room) => room.all.map((reason) => ({ audience: room.title, reason })))
    .filter(({ reason }) => order(reason.rule) >= 0 && reason.points !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.reason.points) - Math.abs(a.reason.points) ||
        order(a.reason.rule) - order(b.reason.rule),
    );
  return found[0] ?? null;
}
