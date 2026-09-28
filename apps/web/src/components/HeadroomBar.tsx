import { formatGbpBn, type AmbitionStatus, type Outcome } from '@btc/engine';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isMissed, ruleTitle } from '../journey/rules';

/**
 * How long the bar waits after the last change before it speaks (Phase 25): long enough for a
 * slider being dragged to settle, so a screen reader hears where it stopped, not every step.
 */
export const BAR_SETTLE_MS = 800;

/**
 * The score while you build, in one slim line that stays in view: headroom in the target year,
 * whether the rules are met (and which are missed when one is), how many priorities are delivered
 * in full and how many only started (settled lower counts as started: Phase 25), amber while any
 * is short, and, only when one is, a promise broken. Every figure is the engine's; the counts are the
 * player's own choices read back. It sits under the header and never covers a control, and
 * nothing on it is said again on the screen below. There is no target: the rules are the line
 * (Phase 24).
 *
 * The bar speaks (Phase 25): one visually hidden polite status region, mounted empty, says the
 * facts that changed, in the bar's own words, once the Budget has settled. While the bar is
 * sticky, the page keeps the height it covers clear, so a focused control never hides under it.
 */
export function HeadroomBar({ outcome, status }: { outcome: Outcome; status: AmbitionStatus }) {
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const missed = outcome.verdicts.filter(isMissed);
  const tone = headroom < 0 ? ' bar__figure--worse' : '';
  // A missed rule by its plain name and the engine's own margin (Phase 25): a player can see
  // which rule to fix, and by how much.
  const rules =
    missed.length === 0
      ? 'rules met'
      : missed
          .map((v) => `${ruleTitle(v)} missed by ${formatGbpBn(Math.abs(v.headroomGbpm), 1)}`)
          .join(' · ');
  const facts: { id: string; text: string; warn?: boolean; short?: boolean }[] = [];
  if (status.priorities.length > 0) {
    facts.push({
      id: 'delivered',
      text: priorityCount(status),
      short: status.delivered < status.priorities.length,
    });
  }
  if (status.broken > 0) {
    facts.push({
      id: 'promises',
      text: `${status.broken} ${status.broken === 1 ? 'promise' : 'promises'} broken`,
      warn: true,
    });
  }
  const figure = formatGbpBn(headroom, 1, headroom < 0);
  const said = {
    headroom: `Headroom, ${year}: ${figure}`,
    rules,
    delivered: facts.find((f) => f.id === 'delivered')?.text ?? '',
    promises:
      facts.find((f) => f.id === 'promises')?.text ??
      (status.broken === 0 ? 'no promise broken' : ''),
  };
  const announcement = useChangedFacts(said);
  const ref = useStickyClearance();
  return (
    <section className="bar" aria-label="Your Budget so far" ref={ref}>
      <p className="bar__headroom">
        <span className="bar__label">Headroom, {year}</span>
        <span className={`bar__figure${tone}`}>{figure}</span>
        <span className={`bar__target${missed.length > 0 ? ' bar__missed' : ''}`}>{rules}</span>
        {facts.map((f) => (
          <span
            key={f.id}
            className={`bar__fact${f.warn ? ' bar__missed' : f.short ? ' bar__short' : ''}`}
          >
            {f.text}
          </span>
        ))}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

/**
 * The facts that changed since the bar last spoke, joined into one sentence, once they have held
 * still for BAR_SETTLE_MS. Empty on arrival: the bar says nothing until the Budget moves.
 */
function useChangedFacts(said: Record<string, string>): string {
  const [message, setMessage] = useState('');
  const last = useRef(said);
  const key = JSON.stringify(said);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const before = last.current;
      last.current = said;
      const changed = Object.keys(said)
        .filter((k) => said[k] !== before[k] && said[k] !== '')
        .map((k) => said[k]);
      if (changed.length > 0) setMessage(`${changed.join('. ')}.`);
    }, BAR_SETTLE_MS);
    return () => window.clearTimeout(timer);
    // The facts are compared by their words; the object itself is new on every render.
  }, [key]);
  return message;
}

/**
 * While the bar is sticky, the page scrolls a focused control clear of it (Phase 25): the root's
 * scroll padding is the bar's own measured height. Put back when the bar goes.
 */
function useStickyClearance() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    const root = document.documentElement;
    if (!bar) return undefined;
    const measure = () => {
      const sticky = getComputedStyle(bar).position === 'sticky';
      root.style.scrollPaddingTop = sticky
        ? `${Math.ceil(bar.getBoundingClientRect().height) + 8}px`
        : '';
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      root.style.scrollPaddingTop = '';
    };
  }, []);
  return ref;
}

/**
 * "1 of 2 priorities delivered · 1 started": delivered in full against the number agreed, then
 * the ones with only a start behind them, a settled-lower ask among them (Phase 25).
 */
export function priorityCount(status: AmbitionStatus): string {
  const started = status.started + status.settledLower;
  const delivered = `${status.delivered} of ${status.priorities.length} ${
    status.priorities.length === 1 ? 'priority' : 'priorities'
  } delivered`;
  return started > 0 ? `${delivered} · ${started} started` : delivered;
}
