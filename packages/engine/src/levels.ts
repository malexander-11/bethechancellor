import type { LevelDisplay, Lever } from './types/data.js';

/** The level a setting moves a rate or threshold to (display only; the engine costs the change). */
export function levelValue(level: LevelDisplay, value: number): number {
  return level.apply === 'add' ? level.baseline + value : level.baseline * (1 + value / 100);
}

/** Format a level in its own unit: "21%", "£13,070", "60.85p", "£28.05 a week", "£236.6bn". */
export function formatLevel(level: LevelDisplay, amount: number): string {
  const decimals =
    level.decimals ??
    (level.unit === 'pct' ? 1 : level.unit === 'pence' ? 2 : level.unit === 'GBPbn' ? 1 : 0);
  const fixed = amount.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  switch (level.unit) {
    case 'pct':
      return `${fixed}%`;
    case 'GBP':
      return `£${fixed}`;
    case 'pence':
      return `${fixed}p`;
    case 'GBPperWeek':
      return `£${fixed} a week`;
    case 'GBPbn':
      return `£${fixed}bn`;
  }
}

/** "20% → 21%" for a moved lever with level metadata; null when the lever has none. */
export function describeLevelChange(lever: Lever, value: number): string | null {
  const level = lever.control.level;
  if (!level) return null;
  return `${formatLevel(level, level.baseline)} → ${formatLevel(level, levelValue(level, value))}`;
}

const MINUS = '−';

/** A setting in its control's own unit, signed: "−1p", "+0.5 points", "+10%", "+£1,040". */
export function formatLeverValue(lever: Lever, value: number): string {
  const decimals = Math.max(0, (lever.control.step.toString().split('.')[1] ?? '').length);
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  const abs = Math.abs(value).toFixed(decimals);
  switch (lever.control.unit) {
    case 'p':
      return `${sign}${abs}p`;
    case 'pp':
      // "+1 point", never "pp" (Phase 25): a point is how a rate's change is said aloud.
      return `${sign}${abs} ${Math.abs(value) === 1 ? 'point' : 'points'}`;
    case 'pct':
      return `${sign}${abs}%`;
    case 'GBP':
      return `${sign}£${Math.abs(value).toLocaleString('en-GB', { maximumFractionDigits: decimals })}`;
    case 'GBPbn':
      return `${sign}£${abs}bn`;
    case 'pctRealPerYear':
      return `${sign}${abs}% a year`;
    case 'bool':
      return value === 1 ? 'On' : 'Off';
    default:
      return `${sign}${abs}`;
  }
}

/** The same, without a trailing ".0": "−1%" for a whole step, as a sentence would say it. */
export function formatLeverValueShort(lever: Lever, value: number): string {
  return formatLeverValue(lever, value).replace(/(\d)\.0(?!\d)/, '$1');
}

/** A spending lever read as a share of its budget (Phase 25): "1% less", "10% more". */
export function shareWords(lever: Lever, value: number): string {
  const size = formatLeverValueShort(lever, Math.abs(value)).replace(/^\+/, '');
  return `${size} ${value < 0 ? 'less' : 'more'}`;
}

/**
 * A setting in the words its size button uses (Phase 26): the level where the lever has one
 * ("21%", "£210"), a select's own label ("Abolish (0%)"), else the change as a share ("1% less",
 * "10% more", "£2 more").
 */
export function sizeWords(lever: Lever, value: number): string {
  const label = lever.control.labels?.[String(value)];
  if (label) return label.replace(/ \(as now\)$/, '');
  const level = lever.control.level;
  if (level) return formatLevel(level, levelValue(level, value));
  return shareWords(lever, value);
}

/** A spending line priced as a share of its forecast path (departments, benefits, investment). */
export function isShareOfSpending(lever: Lever): boolean {
  return lever.costing.kind === 'pctOfBaseline' && lever.classification?.side !== 'receipts';
}

/**
 * Where a moved lever stands, as the review reads it back: its level where it has one ("21%",
 * "£210"); a spending line as its share against the plan ("1% less", Phase 25); otherwise the change
 * itself. A tick box simply is on, and says nothing.
 */
export function leverStanding(lever: Lever, value: number): string | undefined {
  if (lever.control.kind === 'toggle') return undefined;
  const level = lever.control.level;
  if (level) return formatLevel(level, levelValue(level, value));
  return isShareOfSpending(lever) ? shareWords(lever, value) : formatLeverValueShort(lever, value);
}
