import { formatGbpBn } from '../format.js';
import type { Lever, PmFile, SourceRef, SpeechFile, SpeechFragment } from '../types/data.js';
import type { GamePermalink, Outcome } from '../types/engine.js';
import type { AmbitionStatus } from './ambitions.js';
import { rankedPriorities } from './options.js';
import { prioritiesInWords } from './verdict.js';

/**
 * The speech (stage 7), assembled from authored fragments. Every figure in it is read from the
 * outcome and formatted the way the scorecard formats it; every title comes from data. The
 * assembler is deterministic and never writes a sentence of its own: it chooses fragments and
 * fills their placeholders. Each paragraph wears the simulated badge, because a Chancellor's
 * words are the one thing in this tool nobody published.
 */

export type SpeechParagraphKind =
  | 'opening'
  | 'priority'
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
  /** The package as the OBR saw it, for the compromises paragraph. */
  snapshot?: Record<string, number>;
  macroCodes: readonly string[];
  /** Titles of the add-ons, by id. */
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
  iinc2: 'top',
  sdlt5: 'top',
  ct: 'business',
  nicer: 'business',
  nicst: 'business',
  nicpen: 'business',
  brates: 'business',
  bank5: 'business',
  hscl: 'broad',
  epl2: 'business',
  cgtdth: 'top',
  hvcts15: 'top',
  rvapr: 'top',
  nic4: 'broad',
  vatgas: 'broad',
  vatelec: 'broad',
  nicspa: 'broad',
  nicllp: 'top',
  cgtalign: 'top',
  cgtl: 'top',
  cgtexit: 'top',
  cgtprr: 'top',
  pens20: 'top',
  banklevy: 'business',
  nicrent: 'top',
  qelevy: 'business',
  carried: 'top',
  wealth2: 'top',
  sugsalt: 'broad',
  vatthr: 'business',
  ctgh: 'top',
  nicuel: 'top',
  vat1z: 'base',
  pslump: 'top',
  sdltabol: 'top',
  cta: 'broad',
  vatmot: 'broad',
  hmrc2: 'compliance',
  badr: 'top',
  rnrb: 'top',
  fuel: 'motorists',
  rvfuel: 'motorists',
  ved: 'motorists',
  alc: 'duties',
  tob: 'duties',
  apd: 'duties',
  rvgam: 'duties',
  gam2: 'duties',
  ipt: 'broad',
  vatfood: 'base',
  vatnrg: 'base',
  vatkids: 'base',
  vatbook: 'base',
  vattrn: 'base',
  vathome: 'base',
};

const MAX_PRIORITIES_SAID = 3;
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

  // Opening, keyed to the first priority ranked with the Prime Minister.
  const ranked = game && input.pm ? rankedPriorities(game, input.pm) : [];
  const first = ranked[0];
  say('opening', (first && speech.opening[first.id]) ?? speech.opening.default, {
    targetYear: year,
    priorities: input.pm ? prioritiesInWords(input.pm, game?.priorities ?? []) : '',
  });

  // One paragraph per priority delivered, in rank order, naming the options that deliver it.
  const delivered = (status?.priorities ?? [])
    .filter((p) => p.status === 'delivered')
    .slice(0, MAX_PRIORITIES_SAID);
  const deliveredCodes = new Set(
    delivered.flatMap((p) =>
      p.options.filter((o) => o.state === 'on').flatMap((o) => Object.keys(o.option.values)),
    ),
  );
  for (const p of delivered) {
    const on = p.options.filter((o) => o.state === 'on');
    const cost = money(Math.abs(on.reduce((acc, o) => acc + o.costGbpm, 0)));
    say(
      'priority',
      speech.priority,
      {
        title: p.priority.title,
        options: list(on.map((o) => lower(o.option.title))),
        cost,
        targetYear: year,
      },
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
    if (deliveredCodes.has(lever.code)) continue;
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

  // Promises broken by choice are owned, once.
  const broken = (status?.promises ?? []).filter((p) => !p.kept && p.promise.breaks.length > 0);
  if (broken.length > 0) {
    say('lock-break', speech.lockBreak, {
      promises: list(broken.map((p) => lower(p.promise.title))),
    });
  }

  // What was scaled back since the forecast, and what starts later.
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

  // The add-ons, if any, and the last word. Keeping the headroom is only an announcement while
  // there is headroom to keep; with none, the peroration says what there is to say.
  // An add-on id the data no longer offers (an old link) has nothing to say and is left out.
  const known = (id: string) =>
    id.startsWith('further:') || !input.rabbitTitles || input.rabbitTitles[id] !== undefined;
  const addOns = (game?.rabbit ?? []).filter((r) => r !== 'keep' && known(r));
  const keep = (game?.rabbit ?? []).includes('keep') && addOns.length === 0;
  const titleOf = (id: string) =>
    id.startsWith('further:')
      ? (input.pm?.priorities.find((p) => p.id === id.slice('further:'.length))?.title ?? '')
      : (input.rabbitTitles?.[id] ?? '');
  const headroomText = money(headroom);
  if (addOns.length === 1) {
    const id = addOns[0]!;
    const key = id.startsWith('further:') ? 'further' : id;
    say(
      'rabbit',
      speech.rabbit[key] ?? speech.rabbit.several,
      { title: lower(titleOf(id)), titles: lower(titleOf(id)), headroom: headroomText },
      [headroomText],
    );
  } else if (addOns.length > 1) {
    say(
      'rabbit',
      speech.rabbit.several,
      { titles: list(addOns.map((id) => lower(titleOf(id)))), headroom: headroomText },
      [headroomText],
    );
  } else if (keep && headroom > 0) {
    say('rabbit', speech.rabbit.keep, { headroom: headroomText }, [headroomText]);
  }
  const missed = outcome.verdicts.some((v) => v.status === 'notMet' || v.status === 'aboveMargin');
  const perorationKey = game?.breachAccepted && missed ? 'breach' : missed ? 'missed' : 'met';
  // A rule met is stated with its headroom; a rule missed is stated by how much, as a size.
  const closing = missed
    ? formatGbpBn(Math.abs(headroom), 1)
    : formatGbpBn(headroom, 1, headroom < 0);
  say(
    'peroration',
    speech.peroration[perorationKey] ?? speech.peroration.met,
    { headroom: closing, targetYear: year },
    [closing],
  );

  const words = paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0);
  return { paragraphs, words };
}
