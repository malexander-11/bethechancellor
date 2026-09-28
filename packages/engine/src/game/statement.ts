import { isMissed, missedBy } from '../rules/words.js';
import { formatGbpBn } from '../format.js';
import type { Lever, PmFile } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import type { AmbitionStatus } from './ambitions.js';
import { rankedPriorities } from './options.js';
import { preBudget, type OutcomeOf } from './prices.js';
import { THIN_HEADROOM_GBPM, type IncidenceRow } from './verdict.js';
import { groupsInWords, inWords, lowerFirst } from './words.js';

/**
 * "Your Budget, in three sentences" (Phase 25, R3): what was prioritised, how it was paid for, and
 * what was accepted or kept. Every clause is read from the engine's figures and the player's own
 * choices, so no sentence can say the opposite of the sums: an unfunded priority is named as one,
 * borrowing past the rules is named as borrowing, and "out of the headroom I had" is said only
 * when the rules hold. Worked out: the sentences add no number of their own.
 */
export interface Statement {
  prioritised: string;
  paid: string;
  accepted: string;
}

export interface StatementInput {
  game: GamePermalink;
  pm: PmFile;
  outcome: Outcome;
  /** Who paid and who benefited in the target year, and the headroom: the close's own figures. */
  verdict: {
    paid: readonly IncidenceRow[];
    benefited: readonly IncidenceRow[];
    headroomGbpm: number;
  };
  status: AmbitionStatus;
  levers: readonly Lever[];
  /** The engine re-run under the Budget's own settings, for the Budget before any measure. */
  outcomeOf: OutcomeOf;
}

/** Below this a group's figure is too small to name, £ million. */
const NAMED_GBPM = 100;

const list = inWords;
const labels = (rows: readonly IncidenceRow[]) =>
  groupsInWords(rows.map((r) => lowerFirst(r.label)));

/** The first sentence: what was delivered, what was only started, what was named and left. */
export function prioritisedSentence(
  game: GamePermalink,
  pm: PmFile,
  status: AmbitionStatus,
): string {
  const ranked = rankedPriorities(game, pm);
  if (ranked.length === 0) return 'I set no priorities with the Prime Minister.';
  const fate = new Map(status.priorities.map((p) => [p.priority.id, p.status] as const));
  const delivered = ranked.filter((p) => fate.get(p.id) === 'delivered').map((p) => p.noun);
  const started = ranked
    .filter((p) => fate.get(p.id) === 'started' || fate.get(p.id) === 'settledLower')
    .map((p) => p.noun);
  const nothing = ranked
    .filter((p) => (fate.get(p.id) ?? 'notFunded') === 'notFunded')
    .map((p) => p.noun);
  const clauses: string[] = [];
  if (delivered.length > 0) clauses.push(`prioritised ${list(delivered)}`);
  if (started.length > 0) clauses.push(`made a start on ${list(started)}`);
  if (nothing.length > 0) {
    const many = nothing.length > 1;
    clauses.push(
      `named ${list(nothing)} ${many ? 'priorities' : 'a priority'} but put nothing behind ${many ? 'them' : 'it'}`,
    );
  }
  if (clauses.length === 1) return `I ${clauses[0]}.`;
  if (clauses.length === 2) return `I ${clauses[0]}, and ${clauses[1]}.`;
  return `I ${clauses[0]}, ${clauses[1]}, and ${clauses[2]}.`;
}

/**
 * The second sentence: where the money went and where it came from, in the target year. Tax cuts
 * are always named; spending is named when no priority carries it; then who was asked to pay, who
 * was given less, and what borrowing did: past the rules, inside them out of the headroom, or to
 * invest. A Budget that raised more than it spent says it kept the rest as headroom.
 */
export function paidSentence(input: StatementInput): string {
  const { outcome, verdict, status, levers } = input;
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const pre = preBudget(input.outcomeOf, outcome.settings.leverValues, levers);
  const headroomOf = (o: Outcome) =>
    o.verdicts.find((v) => v.kind === 'currentBudget')?.headroomGbpm ?? 0;
  const headroomChange = headroomOf(outcome) - headroomOf(pre);
  const borrowingChange =
    (outcome.paths.policy.psnb[year] ?? 0) - (pre.paths.policy.psnb[year] ?? 0);
  const fiscalMissed = outcome.verdicts.some(
    (v) => (v.kind === 'currentBudget' || v.kind === 'stockFalling') && isMissed(v),
  );
  const policy = outcome.leverEffects.filter((e) => e.category !== 'macro');
  const capitalMore = policy.reduce((acc, e) => acc + Math.max(0, e.capitalSpending[year] ?? 0), 0);
  // What the day-to-day measures cost, net: when it is nothing, a fall in the headroom is only the
  // interest on borrowing to invest, which the rules allow.
  const currentNet = policy.reduce(
    (acc, e) => acc + (e.currentSpending[year] ?? 0) - (e.receipts[year] ?? 0),
    0,
  );

  // The groups, biggest first, as the close totals them: two of a kind, or one of each when the
  // Budget both taxed more and gave less, so the sentence stays one breath long.
  const allPayers = verdict.paid.filter((r) => r.gbpm >= NAMED_GBPM);
  const allLosers = verdict.benefited.filter((r) => r.gbpm <= -NAMED_GBPM);
  const each = allPayers.length > 0 && allLosers.length > 0 ? 1 : 2;
  const payers = allPayers.slice(0, each);
  const losers = allLosers.slice(0, each);
  const gainers = verdict.paid.filter((r) => r.gbpm <= -NAMED_GBPM).slice(0, 2);
  const helped = verdict.benefited.filter((r) => r.gbpm >= NAMED_GBPM).slice(0, 2);

  const pastRules =
    fiscalMissed && (borrowingChange >= NAMED_GBPM || headroomChange <= -NAMED_GBPM);
  const usedHeadroom = !fiscalMissed && headroomChange <= -NAMED_GBPM && currentNet >= NAMED_GBPM;
  const toInvest = !fiscalMissed && borrowingChange >= NAMED_GBPM && capitalMore >= NAMED_GBPM;
  const keptRest = !fiscalMissed && headroomChange >= NAMED_GBPM;

  const priorityWork = status.priorities.some((p) => p.status !== 'notFunded');
  const given = gainers.length > 0 || helped.length > 0;
  if (given) {
    const how: string[] = [];
    if (payers.length > 0) how.push(`asking ${labels(payers)} to pay more`);
    if (losers.length > 0) how.push(`giving less to ${labels(losers)}`);
    if (pastRules) how.push('borrowing more than the rules allow');
    else if (toInvest) how.push('borrowing to invest');
    const onlyHeadroom = how.length === 0 && usedHeadroom;
    if (usedHeadroom && how.length > 0) how.push('using some of the headroom I had');
    const paying = onlyHeadroom
      ? 'paid for it out of the headroom I had'
      : how.length > 0
        ? `paid for it by ${list(how)}`
        : undefined;
    const rest = keptRest && how.length > 0 ? ', and kept the rest as headroom' : '';
    const head =
      gainers.length > 0
        ? `I cut taxes for ${labels(gainers)}`
        : !priorityWork
          ? `I spent more on ${labels(helped)}`
          : undefined;
    if (head) return paying ? `${head}, and ${paying}${rest}.` : `${head}.`;
    if (paying) return `I ${paying}${rest}.`;
    return fiscalMissed
      ? 'I paid for it by borrowing more than the rules allow.'
      : 'I paid for it out of the headroom I had.';
  }
  const took: string[] = [];
  if (payers.length > 0) took.push(`asked ${labels(payers)} to pay more`);
  if (losers.length > 0) took.push(`gave less to ${labels(losers)}`);
  if (took.length > 0) {
    return keptRest ? `I ${list(took)}, and kept the money as headroom.` : `I ${list(took)}.`;
  }
  const moved = outcome.leverEffects.some((e) => e.category !== 'macro');
  return moved
    ? `My changes barely move taxes or spending in ${year}.`
    : 'I changed no taxes and no spending.';
}

/**
 * The third sentence: the most consequential thing given up, in this order: a rule missed, a
 * promise broken, a promise strained or put at risk, a thin margin; with none of those, what was
 * kept. The thin margin is the markets' own line, under ten billion.
 */
export function acceptedSentence(input: StatementInput): string {
  const { outcome, verdict, status } = input;
  const missed = outcome.verdicts.filter(isMissed);
  if (missed.length > 0) return `I accepted missing ${list(missed.map(missedBy))}.`;
  const broken = status.promises.filter((p) => !p.kept && p.promise.judgedBy !== 'fiscalRules');
  if (broken.length > 0) return `I accepted breaking ${list(broken.map((p) => p.promise.noun))}.`;
  const strained = status.strains.filter((s) => s.strained);
  const scored = strained.filter((s) =>
    s.promise.strains.some((rule) => rule.scored && s.strainedBy.some((b) => b.code === rule.code)),
  );
  const atRisk = strained.filter((s) => !scored.includes(s));
  if (strained.length > 0) {
    const parts: string[] = [];
    if (scored.length > 0) parts.push(`straining ${list(scored.map((s) => s.promise.noun))}`);
    if (atRisk.length > 0) parts.push(`putting ${list(atRisk.map((s) => s.promise.noun))} at risk`);
    return `I accepted ${parts.join(' and ')}.`;
  }
  const headroom = formatGbpBn(verdict.headroomGbpm, 1);
  return verdict.headroomGbpm < THIN_HEADROOM_GBPM
    ? `I accepted a thin margin: ${headroom} of headroom.`
    : `I kept every promise and ${headroom} of headroom.`;
}

export function statementOf(input: StatementInput): Statement {
  return {
    prioritised: prioritisedSentence(input.game, input.pm, input.status),
    paid: paidSentence(input),
    accepted: acceptedSentence(input),
  };
}
