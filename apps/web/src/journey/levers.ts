import {
  ministerFor,
  promiseBreaks,
  promiseStrains,
  type AmbitionStatus,
  type Lever,
  type OptionReport,
  type SimulatedLine,
} from '@btc/engine';
import type { LeverNote, RedLine } from '../components/LeverControl';
import { finetuneTitle, levers, ministers, options, pm } from '../data';

const byId = new Map(levers.map((l) => [l.id, l] as const));
/** The flagship option each lever belongs to, if any: what a note names it by. */
const flagshipOf = new Map(
  options.deliver.flatMap((o) => Object.keys(o.values).map((code) => [code, o.title] as const)),
);

/**
 * The manifesto red lines watching each lever, read from the same file the PM's promises come
 * from, and whether the package as it stands crosses each: red where a promise's words are
 * broken, amber where only its spirit is (Phase 23). Pure arithmetic over the levers, so the
 * desk and the fine-tuning screens read it alike, and it works without a game.
 */
export function redLinesOf(values: Record<string, number>): (code: string) => RedLine[] {
  const breaks = promiseBreaks(values, pm.promises, levers);
  const strains = promiseStrains(values, pm.promises, levers);
  return (code) =>
    pm.promises.flatMap((p) => [
      ...p.breaks
        .filter((rule) => rule.code === code)
        .map((rule) => ({
          promise: p.title,
          when: rule.when,
          severity: 'breaks' as const,
          broken:
            breaks.find((b) => b.promise.id === p.id)?.brokenBy.some((b) => b.code === code) ??
            false,
          manifesto: p.origin === 'manifesto-2024',
        })),
      ...p.strains
        .filter((rule) => rule.code === code)
        .map((rule) => ({
          promise: p.title,
          when: rule.when,
          severity: 'strains' as const,
          broken:
            strains.find((s) => s.promise.id === p.id)?.strainedBy.some((b) => b.code === code) ??
            false,
          manifesto: p.origin === 'manifesto-2024',
          scored: rule.scored,
        })),
    ]);
}

/**
 * The flagship options the player chose, by the levers they move, so a lever can say it belongs
 * to one. Lever values are the only state: a flagship lever trimmed elsewhere shows the option as
 * settled lower, and one moved the other way as against it (Phase 25), which is what each now is.
 */
export function chosenByLever(status: AmbitionStatus | null): Map<string, OptionReport> {
  return new Map(
    (status?.priorities ?? [])
      .flatMap((p) => p.options)
      .filter((o) => o.state !== 'off')
      .flatMap((o) => Object.keys(o.option.values).map((code) => [code, o] as const)),
  );
}

/**
 * The Chief Secretary's line when a flagship ask is trimmed short of what was chosen (Phase 25):
 * the ask is settled lower, and whoever made it will say so. The asker is the lever's minister,
 * or the Prime Minister, who agreed the priority, where the lever has none of its own (or the
 * Chief Secretary is its minister). A judgement in a role's voice, with no figure of its own.
 */
export function settledLine(lever: Lever): { who: string; line: SimulatedLine } {
  const { role, text, sources, badge } = options.settled;
  const minister = ministerFor(lever.code, ministers)?.role;
  const asker = minister && minister !== role ? minister : 'Prime Minister';
  return { who: role, line: { text: text.replace('{minister}', asker), sources, badge } };
}

/** What a note calls another lever: its plain title on these screens, its flagship, or its short title. */
function nameOf(lever: Lever): string {
  return finetuneTitle(lever.code) ?? flagshipOf.get(lever.code) ?? lever.shortTitle;
}

/**
 * The warnings that apply to a lever now: every authored interaction between it and a lever that
 * has moved, read from either side of the pair, once per partner. This is how two measures that
 * overlap say so (the fuel duty cut against restoring its uprating): both can be moved, and both
 * warn. A pair that counts the same money (`excludes`, Phase 25) is blocked on these screens; if
 * both are in from the desk, each says it is counted twice.
 */
export function leverNotes(lever: Lever, moved: ReadonlySet<string>): LeverNote[] {
  const out = new Map<string, LeverNote>();
  const add = (other: Lever | undefined, text: string, severity: 'info' | 'warn' | 'excludes') => {
    if (!other || other.code === lever.code || !moved.has(other.code) || out.has(other.code)) {
      return;
    }
    out.set(other.code, {
      key: other.code,
      // Both in from the desk: the pair that counts the same money says so plainly (Phase 25).
      text:
        severity === 'excludes'
          ? `Counted twice with ${nameOf(other)}: ${text}`
          : `Overlaps with ${nameOf(other)}: ${text}`,
      warn: severity !== 'info',
    });
  };
  for (const i of lever.interactions ?? []) add(byId.get(i.withLever), i.text, i.severity);
  for (const other of levers) {
    const i = (other.interactions ?? []).find((x) => x.withLever === lever.id);
    if (i) add(other, i.text, i.severity);
  }
  return [...out.values()];
}
