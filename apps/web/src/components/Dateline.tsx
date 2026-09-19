import { rules } from '../data';

/**
 * One line above the stepper: the in-game date and how long you have got. The Budget date comes
 * from the Charter's own next formal assessment, so a data refresh moves it and nothing here needs
 * editing.
 *
 * This is chrome, not a costing. It carries no badge, because badging it would put a fact the
 * engine did not compute into the same vocabulary as one it did.
 */

const BUDGET_DAY = new Date(`${rules.assessment.nextFormalAssessmentOn}T00:00:00Z`);

const LONG = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function daysToBudget(now: Date): number {
  const ms = BUDGET_DAY.getTime() - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function countdownText(now: Date): string {
  const days = daysToBudget(now);
  if (days === 0) return 'Budget day';
  if (days === 1) return 'Tomorrow is Budget day';
  return `${days} days to the Budget`;
}

export function Dateline({ now = new Date() }: { now?: Date }) {
  return (
    <p className="dateline">
      <time dateTime={now.toISOString().slice(0, 10)}>{LONG.format(now)}</time>
      <span className="dateline__countdown">{countdownText(now)}</span>
    </p>
  );
}
