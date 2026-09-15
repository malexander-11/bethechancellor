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
