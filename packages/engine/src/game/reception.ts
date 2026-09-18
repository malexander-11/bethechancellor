import { formatGbpBn } from '../format.js';
import type { ReceptionBand, ReceptionFile, ReceptionRule, SourceRef } from '../types/data.js';
import { readingsWithCauses, type ReadingsInput } from '../reactions.js';

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
  badge: 'simulated';
}

export interface Reception {
  audience: AudienceId;
  title: string;
  question: string;
  rating: Rating;
  label: string;
  /** The reasons that moved the rating most, at most three, biggest first. */
  reasons: Reason[];
  /** Every rule's fired band, for the "why this rating" disclosure. */
  all: Reason[];
  badge: 'simulated';
}

export interface ReceptionInput extends ReadingsInput {
  reception: ReceptionFile;
}

const MAX_REASONS = 3;

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

function sizeOf(value: number, unit: ReadingUnit): string {
  if (unit === 'GBPm') return formatGbpBn(Math.abs(value), 1);
  if (unit === 'pp') return `${Math.abs(value).toFixed(2)} percentage points`;
  return formatReadingValue(value, unit);
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

/** Deterministic: the same outcome and game always give the same three receptions, in file order. */
export function receptions(input: ReceptionInput): Reception[] {
  const { values, causes } = readingsWithCauses(input);
  return input.reception.audiences.map((audience) => {
    const all: Reason[] = audience.rules.map((rule) => {
      const value = values[rule.measure] ?? 0;
      const band = bandFor(rule, value);
      const unit = rule.reading.unit;
      return {
        rule: rule.id,
        text: band.text
          .replace(/\{value\}/g, formatReadingValue(value, unit))
          .replace(/\{abs\}/g, sizeOf(value, unit)),
        points: band.points,
        direction: band.points > 0 ? 'up' : band.points < 0 ? 'down' : 'flat',
        ...(band.cap !== undefined ? { cap: band.cap } : {}),
        reading: { label: rule.reading.label, value, unit, text: formatReadingValue(value, unit) },
        causes: causes[rule.measure] ?? [],
        sources: band.sources,
        note: rule.note,
        badge: 'simulated',
      };
    });
    const rating = ratingOf(all);
    // Sort is stable, so among equal weights the authored order of the rules holds.
    const reasons = all
      .filter((r) => r.points !== 0)
      .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
      .slice(0, MAX_REASONS);
    return {
      audience: audience.id,
      title: audience.title,
      question: audience.question,
      rating,
      label: audience.labels[rating - 1] ?? '',
      reasons,
      all,
      badge: 'simulated',
    };
  });
}
