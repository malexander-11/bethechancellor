import { formatGbpBn } from '../format.js';
import type { ReceptionBand, ReceptionFile, ReceptionRule, SourceRef } from '../types/data.js';
import { readingsWithCauses, type Cause, type ReadingsInput } from '../reactions.js';

/**
 * The reception (stage 7, Phase 9): how the Budget reads to the backbenchers, the markets and the
 * public, each as a rating of one to five with the reasons that moved it. A rule reads one engine
 * figure, picks the first band whose threshold the figure does not exceed, and contributes the
 * band's points; the rating is three plus the points, clamped to one to five, then held under any
 * fired band's cap (the public's manifesto floor). Deterministic, and every threshold, point and
 * sentence is authored in data/journey/reception.json and badged simulated: the engine compares
 * figures with authored thresholds and picks authored sentences. It produces no number of its own.
 */

export type Rating = 1 | 2 | 3 | 4 | 5;
export type AudienceId = ReceptionFile['audiences'][number]['id'];
export type ReadingUnit = ReceptionRule['reading']['unit'];

export interface Reason {
  rule: string;
  /** The rule's short label (three words at most): how a card names it on the other side. */
  short: string;
  text: string;
  points: number;
  direction: 'up' | 'down' | 'flat';
  cap?: number;
  reading: { label: string; value: number; unit: ReadingUnit; text: string };
  /** The decisions behind the reading, as the levers' own short titles. */
  causes: string[];
  sources: SourceRef[];
  /** The published anchor the rule's thresholds lean on. */
  note: string;
  /** What would have moved this rule up a band, when the rule says and a better band is next door. */
  nudge?: string;
  badge: 'simulated';
}

export interface Reception {
  audience: AudienceId;
  title: string;
  question: string;
  rating: Rating;
  label: string;
  /**
   * The one reason the card shows, which always agrees with the rating (Phase 25): the rule that
   * caps it when a cap binds; below three the biggest minus; above three the biggest plus; at three
   * the biggest minus. None when nothing moved the audience either way.
   */
  lead?: Reason;
  /**
   * The other side, when there is one: up to two rules that pulled the other way, by their short
   * labels. "Counted against: Tax burden · Uncertified costings", or "Counted for: …".
   */
  counted?: { side: 'for' | 'against'; labels: string[] };
  /** How many rules counted for and against, for the fold's summary. */
  tally: { for: number; against: number };
  /** The reasons that moved the rating, at most three: the lead first, then the biggest. */
  reasons: Reason[];
  /** Every rule's fired band, for the "why this rating" disclosure. */
  all: Reason[];
  badge: 'simulated';
}

export interface ReceptionInput extends ReadingsInput {
  reception: ReceptionFile;
}

const MAX_REASONS = 3;
/** The other side's rules named under the lead reason: two at most, so the line stays short. */
const MAX_COUNTED = 2;
/** At most this many causes after "Because of". */
const MAX_CAUSES = 3;

/**
 * Readings that are themselves a change from the plan: a cause counts when it moved the reading
 * the same way the reading moved. The rest are levels (headroom, the rules' standing, what was
 * raised), whose causes are those that pushed the way the reason points.
 */
const CHANGE_READINGS = new Set([
  'borrowingChangeGbpm',
  'cumulativeBorrowingChangeGbpm',
  'debtChangePp',
  'taxTakeChangePp',
  'welfareChangeGbpm',
  'publicServiceSpendingGbpm',
  'capitalChangeGbpm',
  'netRevenueGbpm',
  'progressiveBalanceGbpm',
]);

/** A reading written out, the way the scorecard writes the same figure. */
export function formatReadingValue(value: number, unit: ReadingUnit): string {
  switch (unit) {
    case 'GBPm':
      return formatGbpBn(value, 1, true);
    case 'pp':
      return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)} percentage points`;
    case 'ratio':
      return `${Math.round(value * 100)}%`;
    case 'count':
      return String(Math.round(value));
    case 'status':
      return '';
  }
}

/**
 * Points of the economy in words (Phase 25): "about half a point", never "+0.74 percentage
 * points". Quarters up to a point, halves beyond.
 */
export function pointsInWords(pp: number): string {
  const v = Math.abs(pp);
  if (v < 0.125) return 'less than an eighth of a point';
  if (v < 0.375) return 'about a quarter of a point';
  if (v < 0.625) return 'about half a point';
  if (v < 0.875) return 'about three-quarters of a point';
  if (v < 1.25) return 'about a point';
  const halves = Math.round(v * 2) / 2;
  return `about ${Number.isInteger(halves) ? halves.toFixed(0) : halves.toFixed(1)} points`;
}

function sizeOf(value: number, unit: ReadingUnit): string {
  if (unit === 'GBPm') return formatGbpBn(Math.abs(value), 1);
  if (unit === 'pp') return pointsInWords(value);
  return formatReadingValue(value, unit);
}

/**
 * Which way a rule's reading is good: +1 when its bands give more points higher up, −1 when fewer,
 * 0 when the bands do not say. Read from the authored bands, so no rule states it twice.
 */
function polarityOf(rule: ReceptionRule): 1 | -1 | 0 {
  const first = rule.bands[0];
  const last = rule.bands[rule.bands.length - 1];
  if (!first || !last || first.points === last.points) return 0;
  return last.points > first.points ? 1 : -1;
}

/**
 * The causes a reason names (Phase 25): only those that pushed the way the reason says. For a
 * change, the decisions that moved it the way it moved; for a level, those that pushed it the way
 * the band points (a thin margin names what cut it, never what added to it), and none for a band
 * that scores nothing. A list with no direction (a promise broken, a priority left unfunded) is
 * named as it is.
 */
function causesFor(
  rule: ReceptionRule,
  band: ReceptionBand,
  value: number,
  causes: readonly Cause[],
): string[] {
  const directed = causes.filter((c) => c.delta !== undefined);
  if (directed.length === 0) return causes.slice(0, MAX_CAUSES).map((c) => c.title);
  let want: number;
  if (CHANGE_READINGS.has(rule.measure)) {
    want = Math.sign(value);
  } else {
    const polarity = polarityOf(rule);
    want = band.points === 0 || polarity === 0 ? 0 : band.points > 0 ? polarity : -polarity;
  }
  if (want === 0) return [];
  return [
    ...new Set(directed.filter((c) => Math.sign(c.delta ?? 0) === want).map((c) => c.title)),
  ].slice(0, MAX_CAUSES);
}

function bandFor(rule: ReceptionRule, value: number): ReceptionBand {
  for (const band of rule.bands) {
    if (band.upTo === undefined || value <= band.upTo) return band;
  }
  // The schema requires a last band with no upTo, so this is unreachable in validated data.
  const last = rule.bands[rule.bands.length - 1];
  if (!last) throw new Error(`reception rule ${rule.id} has no bands`);
  return last;
}

/**
 * The band's words: its own, or the first variant whose second reading holds (Phase 25). A variant
 * changes the sentence and its sources only; the points and the cap stay the band's.
 */
function wordsFor(
  band: ReceptionBand,
  values: Record<string, number>,
): { text: string; sources: SourceRef[] } {
  for (const variant of band.variants ?? []) {
    const reading = values[variant.when.measure] ?? 0;
    const { above, below } = variant.when;
    if ((above === undefined || reading > above) && (below === undefined || reading < below)) {
      return {
        text: variant.text,
        sources: variant.sources.length > 0 ? variant.sources : band.sources,
      };
    }
  }
  return { text: band.text, sources: band.sources };
}

/**
 * "£1.2bn less in tax rises would have moved this by a point": the distance from the reading to
 * the nearest neighbouring band with more points, in the reading's own unit, dropped into the
 * rule's authored sentence. Only for money and percentage-point readings, only when the rule
 * carries a nudge, and never for the best band there is.
 */
function nudgeFor(rule: ReceptionRule, band: ReceptionBand, value: number): string | undefined {
  const unit = rule.reading.unit;
  if (!rule.nudge || (unit !== 'GBPm' && unit !== 'pp')) return undefined;
  const i = rule.bands.indexOf(band);
  const gaps: number[] = [];
  const below = rule.bands[i - 1];
  if (below && below.points > band.points && below.upTo !== undefined)
    gaps.push(value - below.upTo);
  const above = rule.bands[i + 1];
  if (above && above.points > band.points && band.upTo !== undefined) gaps.push(band.upTo - value);
  const gap = gaps.filter((g) => g >= 0).sort((a, b) => a - b)[0];
  if (gap === undefined) return undefined;
  // Written to the resolution the reading is written in, so the sentence never says "£0.0bn".
  const shown = unit === 'GBPm' ? Math.max(100, Math.ceil(gap / 100) * 100) : Math.max(0.01, gap);
  return rule.nudge.replace(/\{gap\}/g, sizeOf(shown, unit));
}

export function clampRating(n: number): Rating {
  return Math.max(1, Math.min(5, Math.round(n))) as Rating;
}

/** Three plus the points, clamped, then held under any cap in force. */
export function ratingOf(reasons: readonly Pick<Reason, 'points' | 'cap'>[]): Rating {
  let rating = clampRating(3 + reasons.reduce((acc, r) => acc + r.points, 0));
  for (const r of reasons) {
    if (r.cap !== undefined && r.cap < rating) rating = clampRating(r.cap);
  }
  return rating;
}

/**
 * The one reason a card shows, which never contradicts its rating (Phase 25): the rule that caps it
 * when a cap binds; below three the biggest minus; above three the biggest plus; at three the
 * biggest minus, if anything pulled down. Ties go to the order the rules are written in.
 */
function leadOf(all: readonly Reason[], rating: Rating): Reason | undefined {
  const uncapped = clampRating(3 + all.reduce((acc, r) => acc + r.points, 0));
  const byWeight = (a: Reason, b: Reason) => Math.abs(b.points) - Math.abs(a.points);
  if (rating < uncapped) {
    const capping = all
      .filter((r) => r.cap !== undefined && r.cap <= rating)
      .sort((a, b) => (a.cap ?? 5) - (b.cap ?? 5) || a.points - b.points);
    if (capping[0]) return capping[0];
  }
  const minus = all.filter((r) => r.points < 0).sort(byWeight);
  const plus = all.filter((r) => r.points > 0).sort(byWeight);
  return rating > 3 ? plus[0] : minus[0];
}

/** Deterministic: the same outcome and game always give the same three receptions, in file order. */
export function receptions(input: ReceptionInput): Reception[] {
  const { values, causes, words: filled } = readingsWithCauses(input);
  const typicalError = formatGbpBn(input.typicalErrorGbpm, 0);
  return input.reception.audiences.map((audience) => {
    const all: Reason[] = audience.rules.map((rule) => {
      const value = values[rule.measure] ?? 0;
      const band = bandFor(rule, value);
      const unit = rule.reading.unit;
      const words = wordsFor(band, values);
      return {
        rule: rule.id,
        short: rule.short,
        text: words.text
          .replace(/\{value\}/g, formatReadingValue(value, unit))
          .replace(/\{abs\}/g, sizeOf(value, unit))
          .replace(/\{typicalError\}/g, typicalError)
          .replace(/\{payers\}/g, filled.payers || 'everyone else'),
        points: band.points,
        direction: band.points > 0 ? 'up' : band.points < 0 ? 'down' : 'flat',
        ...(band.cap !== undefined ? { cap: band.cap } : {}),
        reading: { label: rule.reading.label, value, unit, text: formatReadingValue(value, unit) },
        causes: causesFor(rule, band, value, causes[rule.measure] ?? []),
        sources: words.sources,
        note: rule.note,
        ...(nudgeFor(rule, band, value) !== undefined
          ? { nudge: nudgeFor(rule, band, value) }
          : {}),
        badge: 'simulated',
      };
    });
    const rating = ratingOf(all);
    const lead = leadOf(all, rating);
    // Sort is stable, so among equal weights the authored order of the rules holds.
    const reasons = [
      ...(lead ? [lead] : []),
      ...all
        .filter((r) => r.points !== 0 && r !== lead)
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    ].slice(0, MAX_REASONS);
    // The other side, by short label: what pulled against the lead's direction.
    const other = lead
      ? all
          .filter((r) => (lead.points < 0 ? r.points > 0 : r.points < 0))
          .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
          .slice(0, MAX_COUNTED)
      : [];
    return {
      audience: audience.id,
      title: audience.title,
      question: audience.question,
      rating,
      label: audience.labels[rating - 1] ?? '',
      ...(lead ? { lead } : {}),
      ...(lead && other.length > 0
        ? {
            counted: {
              side: lead.points < 0 ? ('for' as const) : ('against' as const),
              labels: other.map((r) => r.short),
            },
          }
        : {}),
      tally: {
        for: all.filter((r) => r.points > 0).length,
        against: all.filter((r) => r.points < 0).length,
      },
      reasons,
      all,
      badge: 'simulated',
    };
  });
}
