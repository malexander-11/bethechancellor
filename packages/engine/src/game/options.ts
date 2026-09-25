import { fyStart } from '../calc/years.js';
import type { Lever } from '../types/data.js';
import type {
  AffordOption,
  DeliverOption,
  IncidenceFile,
  OptionsFile,
  Promise_,
} from '../types/data.js';
import { deliversTarget, promiseBreaks } from './ambitions.js';

/**
 * The options (Phase 18, ADR-0022): bundles of lever settings that advisers propose and the
 * Chancellor chooses among. Nothing here prices anything; the page runs the engine. What lives
 * here is the reading of an option against the Budget as it stands: on, adjusted or off; which
 * red lines it crosses; the latest of its levers' earliest starts; which moved levers it
 * interacts with; and which who-pays tab a way to afford belongs to.
 */

export type OptionState = 'on' | 'adjusted' | 'off';

interface Bundle {
  id: string;
  values: Record<string, number>;
}

function leverMap(levers: readonly Lever[]): Map<string, Lever> {
  return new Map(levers.map((l) => [l.code, l] as const));
}

/**
 * On when every lever in the bundle is at, or beyond, the option's value in its direction (a
 * player who went further on the desk has still chosen it); adjusted when some lever has moved
 * but not to there; off when nothing has moved.
 */
export function optionState(
  option: Bundle,
  values: Record<string, number>,
  levers: readonly Lever[],
): OptionState {
  const byCode = leverMap(levers);
  let delivered = 0;
  let moved = 0;
  const codes = Object.keys(option.values);
  for (const code of codes) {
    const lever = byCode.get(code);
    const base = lever?.control.default ?? 0;
    const current = values[code] ?? base;
    if (current !== base) moved += 1;
    if (deliversTarget(lever, current, option.values[code] ?? base)) delivered += 1;
  }
  if (codes.length > 0 && delivered === codes.length) return 'on';
  return moved > 0 ? 'adjusted' : 'off';
}

/** The lever values that switch an option off: each of its levers back at its default. */
export function optionOff(option: Bundle, levers: readonly Lever[]): Record<string, number> {
  const byCode = leverMap(levers);
  return Object.fromEntries(
    Object.keys(option.values).map((code) => [code, byCode.get(code)?.control.default ?? 0]),
  );
}

/** The ways to deliver one priority, in the file's order. */
export function deliverOptionsFor(priorityId: string, options: OptionsFile): DeliverOption[] {
  return options.deliver.filter((o) => o.priority === priorityId);
}

/** The latest earliest start among the option's levers (ADR-0021), if any carries one. */
export function optionEarliestStart(option: Bundle, levers: readonly Lever[]): string | undefined {
  const byCode = leverMap(levers);
  let latest: string | undefined;
  for (const code of Object.keys(option.values)) {
    const year = byCode.get(code)?.earliestStart?.year;
    if (year && (!latest || fyStart(year) > fyStart(latest))) latest = year;
  }
  return latest;
}

export interface OptionRedLine {
  promise: string;
  when: 'above' | 'below' | 'on';
  /** Whether the Budget with this option in it crosses the line. */
  broken: boolean;
}

/**
 * The manifesto red lines that watch any of the option's levers, and whether choosing it would
 * cross them given the rest of the Budget.
 */
export function optionRedLines(
  option: Bundle,
  promises: readonly Promise_[],
  levers: readonly Lever[],
  current: Record<string, number>,
): OptionRedLine[] {
  const codes = new Set(Object.keys(option.values));
  const watching = promises.filter((p) => p.breaks.some((rule) => codes.has(rule.code)));
  if (watching.length === 0) return [];
  const reports = promiseBreaks({ ...current, ...option.values }, watching, levers);
  return watching.map((promise) => {
    const rule = promise.breaks.find((r) => codes.has(r.code));
    const report = reports.find((r) => r.promise.id === promise.id);
    return {
      promise: promise.title,
      when: rule?.when ?? 'on',
      broken: report ? report.brokenBy.some((b) => codes.has(b.code)) : false,
    };
  });
}

export interface OptionOverlap {
  /** The lever already moved that this option's lever interacts with. */
  withLever: Lever;
  text: string;
  severity: 'info' | 'warn';
}

/** The authored interactions between the option's levers and levers the player has already moved. */
export function optionOverlaps(
  option: Bundle,
  levers: readonly Lever[],
  moved: ReadonlySet<string>,
): OptionOverlap[] {
  const byCode = leverMap(levers);
  const byId = new Map(levers.map((l) => [l.id, l] as const));
  const codes = new Set(Object.keys(option.values));
  const out: OptionOverlap[] = [];
  for (const code of codes) {
    for (const i of byCode.get(code)?.interactions ?? []) {
      const other = byId.get(i.withLever);
      if (other && moved.has(other.code) && !codes.has(other.code)) {
        out.push({ withLever: other, text: i.text, severity: i.severity });
      }
    }
  }
  return out;
}

/**
 * The who-pays tabs of the ways to afford, each a set of incidence pays-groups
 * (data/journey/incidence.json). Small groups join the nearest large one.
 */
export const AFFORD_TABS: readonly { id: string; label: string; groups: readonly string[] }[] = [
  { id: 'everyone', label: 'Everyone', groups: ['broad-base', 'tax-gap', 'working-pensioners'] },
  { id: 'best-off', label: 'The best-off', groups: ['top'] },
  { id: 'business', label: 'Business', groups: ['business'] },
  { id: 'savers-owners', label: 'Savers and owners', groups: ['savers-owners'] },
  {
    id: 'duties',
    label: 'Drivers, drinkers, smokers, gamblers, flyers',
    groups: ['duties', 'motorists', 'flyers', 'disabled-motorists'],
  },
];

export interface AffordTab {
  tab: (typeof AFFORD_TABS)[number];
  options: AffordOption[];
}

/** The ways to afford, grouped into the who-pays tabs by their first lever's incidence tag. */
export function affordTabs(options: OptionsFile, incidence: IncidenceFile): AffordTab[] {
  return AFFORD_TABS.map((tab) => ({
    tab,
    options: options.afford.filter((o) => {
      const code = Object.keys(o.values)[0];
      const group = code ? incidence.levers[code] : undefined;
      return group !== undefined && tab.groups.includes(group);
    }),
  }));
}
