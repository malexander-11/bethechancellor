import { formatGbpBn } from '../format.js';
import { describeLevelChange } from '../levels.js';
import type { Lever, PmFile, SourceRef, SpeechFile, SpeechFragment } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import type { AmbitionStatus } from './ambitions.js';
import { themesInWords } from './verdict.js';

/**
 * The speech (stage 7), assembled from authored fragments. Every figure in it is read from the
 * outcome and formatted the way the scorecard formats it; every title comes from data. The
 * assembler is deterministic and never writes a sentence of its own: it chooses fragments and
 * fills their placeholders. Each paragraph wears the simulated badge, because a Chancellor's
 * words are the one thing in this tool nobody published.
 */

export type SpeechParagraphKind =
  | 'opening'
  | 'flagship'
  | 'spending'
  | 'cuts'
  | 'revenue'
  | 'giveaways'
  | 'lock-break'
  | 'compromises'
  | 'delay'
  | 'rabbit'
  | 'peroration';

export interface SpeechParagraph {
  kind: SpeechParagraphKind;
  text: string;
  sources: SourceRef[];
  badge: 'simulated';
  /** The engine figures this paragraph quotes, as formatted, so a test can check every number. */
  figures: string[];
}

export interface Speech {
  paragraphs: SpeechParagraph[];
  words: number;
}

export interface SpeechInput {
  speech: SpeechFile;
  outcome: Outcome;
  levers: readonly Lever[];
  game?: GamePermalink;
  pm?: PmFile;
  status?: AmbitionStatus;
  /** The package as it left the desk, for the compromises paragraph. */
  snapshot?: Record<string, number>;
  macroCodes: readonly string[];
  /** Titles of the rabbit options, by id. */
  rabbitTitles?: Record<string, string>;
}

/** Who a revenue measure falls on. A closed map, so the speech never guesses. */
const REVENUE_CLASS: Record<string, string> = {
  itbr: 'broad',
  ithr: 'broad',
  nicm: 'broad',
  nica: 'broad',
  vats: 'broad',
  vatr: 'broad',
  itpa: 'broad',
  nicpt: 'broad',
  itbrl: 'broad',
  itar: 'top',
  it50: 'top',
  cgth: 'top',
  iht: 'top',
  wealth: 'top',
  pens30: 'top',
  sdlt5: 'top',
  ct: 'business',
  nicer: 'business',
  nicst: 'business',
  nicpen: 'business',
  badr: 'top',
  rnrb: 'top',
  fuel: 'motorists',
  rvfuel: 'motorists',
  ved: 'motorists',
  alc: 'duties',
  tob: 'duties',
  apd: 'duties',
  rvgam: 'duties',
  ipt: 'broad',
  vatfood: 'base',
  vatnrg: 'base',
  vatkids: 'base',
  vatbook: 'base',
  vattrn: 'base',
  vathome: 'base',
};

const MAX_FLAGSHIPS = 3;
const MAX_LIST = 3;

function fill(fragment: SpeechFragment, values: Record<string, string>): string {
  return fragment.text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

function list(titles: string[]): string {
  const shown = titles.slice(0, MAX_LIST);
  const rest = titles.length - shown.length;
  const joined =
    shown.length <= 1
      ? (shown[0] ?? '')
      : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${joined}, and ${rest} more` : joined;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function assembleSpeech(input: SpeechInput): Speech {
  const { speech, outcome, levers, game, status, macroCodes } = input;
  const byCode = new Map(levers.map((l) => [l.code, l] as const));
  const stability = outcome.verdicts.find((v) => v.kind === 'currentBudget');
  const year = stability?.targetYear ?? '';
  const headroom = stability?.headroomGbpm ?? 0;
  const values = outcome.settings.leverValues;
  const paragraphs: SpeechParagraph[] = [];
  const say = (
    kind: SpeechParagraphKind,
    fragment: SpeechFragment | undefined,
    vars: Record<string, string>,
    figures: string[] = [],
  ) => {
    if (!fragment) return;
    paragraphs.push({
      kind,
      text: fill(fragment, vars),
      sources: fragment.sources,
      badge: 'simulated',
      figures,
    });
  };
  const money = (gbpm: number) => formatGbpBn(gbpm, 1);
  const effectOf = (code: string) => {
    const e = outcome.leverEffects.find((x) => x.code === code);
    if (!e) return { cost: 0, receipts: 0 };
    return {
      cost: (e.currentSpending[year] ?? 0) + (e.capitalSpending[year] ?? 0),
      receipts: e.receipts[year] ?? 0,
    };
  };

  // Opening, keyed to the theme agreed with the Prime Minister; two or more share one opening.
  const themes = game?.themes ?? [];
  const openingKey = themes.length === 0 ? 'default' : themes.length === 1 ? themes[0]! : 'several';
  say('opening', speech.opening[openingKey] ?? speech.opening.default, {
    targetYear: year,
    themes: input.pm ? themesInWords(input.pm, themes) : '',
  });

  // One paragraph per funded flagship, biggest first.
  const funded = (status?.priorities ?? [])
    .filter((p) => p.status === 'funded' || p.status === 'delayed')
    .sort((a, b) => b.costGbpm - a.costGbpm)
    .slice(0, MAX_FLAGSHIPS);
  const flagshipCodes = new Set(funded.map((p) => p.flagship.target.code));
  for (const p of funded) {
    const lever = byCode.get(p.flagship.target.code);
    // Rates and thresholds have a level to state ("20% → 21%"); a spending line has only its cost.
    const level = lever ? describeLevelChange(lever, p.current) : null;
    const cost = money(Math.abs(p.costGbpm));
    say(
      'flagship',
      speech.flagship,
      { title: p.flagship.title, detail: level ? `${level}, ${cost}` : cost, targetYear: year },
      [cost],
    );
  }

  // Other spending, cuts, revenue and giveaways, read off the package.
  const spending: string[] = [];
  const cuts: string[] = [];
  const revenue = new Map<string, { titles: string[]; yieldGbpm: number }>();
  const giveaways: string[] = [];
  for (const effect of outcome.leverEffects) {
    const lever = byCode.get(effect.code);
    if (!lever || lever.category === 'macro' || macroCodes.includes(lever.code)) continue;
    if (flagshipCodes.has(lever.code)) continue;
    const { cost, receipts } = effectOf(lever.code);
    if (lever.category === 'tax' || receipts !== 0) {
      if (receipts > 0) {
        const cls = REVENUE_CLASS[lever.code] ?? 'broad';
        const entry = revenue.get(cls) ?? { titles: [], yieldGbpm: 0 };
        entry.titles.push(lower(lever.shortTitle));
        entry.yieldGbpm += receipts;
        revenue.set(cls, entry);
      } else if (receipts < 0) {
        giveaways.push(lower(lever.shortTitle));
      }
      continue;
    }
    if (cost > 0) spending.push(lower(lever.shortTitle));
    else if (cost < 0) cuts.push(lower(lever.shortTitle));
  }
  if (spending.length > 0) say('spending', speech.spending, { measures: list(spending) });
  if (cuts.length > 0) say('cuts', speech.cuts, { measures: list(cuts) });
  for (const [cls, entry] of [...revenue.entries()].sort(
    (a, b) => b[1].yieldGbpm - a[1].yieldGbpm,
  )) {
    const fragment = speech.revenue[cls] ?? speech.revenue.broad;
    const yieldText = money(entry.yieldGbpm);
    say('revenue', fragment, { measures: list(entry.titles), yield: yieldText, targetYear: year }, [
      yieldText,
    ]);
  }
  if (giveaways.length > 0) say('giveaways', speech.giveaways, { measures: list(giveaways) });

  // Promises broken on the desk are owned, once.
  const broken = (status?.promises ?? []).filter((p) => !p.kept && p.promise.breaks.length > 0);
  if (broken.length > 0) {
    say('lock-break', speech.lockBreak, {
      promises: list(broken.map((p) => lower(p.promise.title))),
    });
  }

  // What was scaled back since the desk, and what starts later.
  if (input.snapshot) {
    let count = 0;
    for (const [code, was] of Object.entries(input.snapshot)) {
      const lever = byCode.get(code);
      if (!lever || macroCodes.includes(code) || lever.category === 'tax') continue;
      const now = values[code] ?? lever.control.default;
      if (now < was) count += 1;
    }
    if (count > 0) say('compromises', speech.compromises, { count: String(count) });
  }
  for (const [code, toYear] of Object.entries(game?.delays ?? {})) {
    const lever = byCode.get(code);
    if (!lever || (values[code] ?? lever.control.default) === lever.control.default) continue;
    say('delay', speech.delay, { title: lower(lever.title), year: toYear });
  }

  // The rabbit, if there is one, and the last word. Keeping the headroom is only an announcement
  // while there is headroom to keep; with none, the peroration says what there is to say.
  const rabbit = game?.rabbit;
  if (rabbit && !(rabbit === 'keep' && headroom <= 0)) {
    const key = rabbit.startsWith('flagship:') ? 'flagship' : rabbit;
    const flagshipId = rabbit.startsWith('flagship:') ? rabbit.slice('flagship:'.length) : '';
    const title = rabbit.startsWith('flagship:')
      ? (input.pm?.flagships.find((f) => f.id === flagshipId)?.title ?? '')
      : (input.rabbitTitles?.[rabbit] ?? '');
    const headroomText = money(headroom);
    say(
      'rabbit',
      speech.rabbit[key] ?? speech.rabbit.keep,
      { title: lower(title), headroom: headroomText },
      [headroomText],
    );
  }
  const missed = outcome.verdicts.some((v) => v.status === 'notMet' || v.status === 'aboveMargin');
  const perorationKey = game?.breachAccepted && missed ? 'breach' : missed ? 'missed' : 'met';
  // A rule met is stated with its headroom; a rule missed is stated by how much, as a size.
  const headroomText = missed
    ? formatGbpBn(Math.abs(headroom), 1)
    : formatGbpBn(headroom, 1, headroom < 0);
  say(
    'peroration',
    speech.peroration[perorationKey] ?? speech.peroration.met,
    { headroom: headroomText, targetYear: year },
    [headroomText],
  );

  const words = paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);
  return { paragraphs, words };
}
