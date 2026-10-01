import {
  FINAL_STAGE,
  GAME_SETTINGS,
  SHARE_WORDS,
  encodePermalink,
  excludesPartners,
  finetuneItems,
  gameImplementationYear,
  gameOutcomeOf,
  plainText,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { takesOutWords } from '../components/LeverControl';
import { INVESTMENT_NOTE, RELIEF_NOTE } from '../components/LeverRow';
import { MODE_WORDS } from '../components/ModeLine';
import {
  electorate,
  finetune,
  finetuneName,
  gameData,
  guide,
  interventions,
  levers,
  ministers,
  options,
  pm,
  reception,
} from '../data';
import { BOARD_TEXT, countsWords } from '../board/words';
import { briefingTemplates, fillIn } from '../journey/briefingWords';
import { SHARE_TEXT } from '../share/words';

const short = (l: { text: string; short?: string | undefined }) => l.short ?? l.text;
const all = options.deliver;
const curated = finetuneItems(finetune);

/**
 * Three finished Budgets from the data, summed up as a shared Budget is: one that changes nothing,
 * one with the first flagship of each of the first two priorities, and one with the first flagship
 * of every priority, which misses rules.
 */
const SHARED_BUDGETS = (() => {
  const first = (id: string) => all.find((o) => o.priority === id)?.values ?? {};
  const ids = pm.priorities.map((p) => p.id);
  const outcomeOf = gameOutcomeOf(gameData);
  return [ids.slice(0, 0), ids.slice(0, 2), ids].map((chosen) => {
    const query = encodePermalink(
      {
        vintageCode: gameData.vintage.permalinkCode,
        rulesCode: gameData.rules.permalinkCode,
        implementationYear: gameImplementationYear(gameData.vintage),
        leverValues: Object.assign({}, ...chosen.map(first)) as Record<string, number>,
        ...GAME_SETTINGS,
        game: { reached: FINAL_STAGE, priorities: chosen.slice(0, 3) },
      },
      gameData.levers,
    );
    const budget = readFinishedBudget(gameData, query);
    if (!budget) throw new Error('a finished Budget did not read as one');
    return summariseBudget(gameData, budget, outcomeOf);
  });
})();

/**
 * Every set of words a player meets with the folds closed, by where it is met: the one list the
 * tests of plain words read (journey/readability.test.ts, journey/words.test.ts). A lever's own
 * headline is left out: it waits under "More about these", in the Treasury's terms.
 */
export const ON_SCREEN: Record<string, readonly string[]> = {
  'the guide': guide.stages.flatMap((s) => [s.title, s.now]),
  'option titles': all.map((o) => o.title),
  'option advice': all.map((o) => o.advice.text),
  // Graded delivery (Phase 25): why a way only makes a start, and the Chief Secretary's line.
  'the delivery scales': [...all.map((o) => o.scale.why), options.settled.text],
  'the fine-tuning screens': [
    ...[finetune.tax, finetune.spending].flatMap((s) => [
      s.title,
      s.lead,
      ...s.groups.map((g) => g.label),
      ...s.notes.map((n) => n.text),
    ]),
    // The questions each section asks (ADR-0035, spending since ADR-0037), read before any is
    // opened, and the name over each set of ticks that contradict each other (ADR-0036).
    ...[finetune.tax, finetune.spending].flatMap((side) =>
      side.groups.flatMap((g) =>
        g.decisions.flatMap((d) => [d.title, ...(d.alternatives ?? []).map((a) => a.name)]),
      ),
    ),
    ...curated.flatMap((i) => [...(i.name ? [i.name] : []), ...i.policies.map((p) => p.title)]),
    // Each choice's short name inside its decision (ADR-0037). The spending fold's subheads went
    // with the fold.
    ...curated.flatMap((i) => (i.label ? [i.label] : [])),
    // What a card says once for all its rows (ADR-0037): a relief's cost, and investment's rule.
    RELIEF_NOTE,
    INVESTMENT_NOTE,
  ],
  'the fine-tuning advice': curated.flatMap((i) => i.policies.map((p) => p.advice.text)),
  // What choosing a lever would take out (ADR-0036), said on its card before it is touched: every
  // pair that counts the same money, from both sides, as a tick or a scale says it.
  'what a choice takes out': curated.flatMap((i) => {
    const lever = levers.find((l) => l.code === i.code);
    if (!lever) return [];
    const kind = lever.control.kind === 'toggle' ? 'tick' : 'scale';
    return excludesPartners(lever, levers).map(
      (p) => `${takesOutWords([finetuneName(p.lever.code) ?? p.lever.shortTitle], kind)} ${p.text}`,
    );
  }),
  'the priorities': pm.priorities.flatMap((p) => [
    p.title,
    p.purpose,
    short(p.reaction),
    ...(p.reach ? [p.reach.text] : []),
  ]),
  // Phase 25: the lines that say why two options cannot both be on.
  'the conflicts': all.flatMap((o) => (o.conflicts ?? []).map((c) => c.text)),
  // Phase 25: the Prime Minister at sign-off, as the review reads a line out.
  'the sign-off': Object.values(pm.signOff).map((l) =>
    l.text.replace('{rules}', 'the debt rule').replace('{promises}', 'the tax lock'),
  ),
  'the promises': pm.promises.flatMap((p) => [
    p.title,
    ...p.strains.map((s) => s.text).filter((t): t is string => t !== undefined),
  ]),
  // Budget day's five households, open on the page (ADR-0043): who each is, what each says of what
  // touched it and of what the Budget was for, and its sourced fact.
  'the households': [
    ...electorate.households.flatMap((h) => [
      h.who,
      h.fact.text,
      h.untouched.text,
      h.understood.text,
      h.puzzled.text,
      ...h.touches.map((t) => t.line.text),
    ]),
    electorate.unnamed.text,
  ],
  // What a Budget-day card shows (ADR-0043): its title, its rating's label, its one reason, and the
  // short labels of the rules on the other side.
  'the reception cards': reception.audiences.flatMap((a) => [
    a.title,
    ...a.labels,
    ...a.rules.flatMap((r) => [
      r.short,
      ...r.bands.flatMap((b) => [b.text, ...(b.variants ?? []).map((v) => v.text)]),
    ]),
  ]),
  'the interventions': interventions.interventions.map((x) => short(x.line)),
  'the ministers': ministers.ministers.flatMap((m) =>
    [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(short),
  ),
  // Basic and advanced (Phase 27): the line on a trimmed screen and what it says once pressed.
  // The footer's switch and its note went with ADR-0032.
  'the modes': [
    `${MODE_WORDS.shortlist} ${MODE_WORDS.ideas.basic}.`,
    `${MODE_WORDS.ideas.advanced}.`,
    ...Object.values(MODE_WORDS.said).flatMap((s) => [s.basic, s.advanced]),
  ],
  // Sharing a Budget (ADR-0044): Budget day's way to share it, the picture's words, and the page a
  // shared link opens, with the words a preview and a post carry, for three Budgets from the data.
  'sharing a Budget': [
    ...Object.values(SHARE_TEXT),
    ...Object.values(SHARE_WORDS).map((w) =>
      w
        .replace('{n}', '2')
        .replace('{host}', 'example.org')
        .replace('{label}', 'Divided')
        .replace('{rating}', '3'),
    ),
    ...SHARED_BUDGETS.flatMap((summary) => {
      const words = summaryWords(summary);
      return [
        words.title,
        words.description,
        words.share,
        ...[...summary.tax, ...summary.spending].map((row) =>
          [row.name, row.standing, row.words].filter(Boolean).join(' · '),
        ),
        ...summary.ratings.map((r) => `${r.title}: ${r.label}, ${r.rating} of 5`),
      ];
    }),
  ],
  // The leaderboard (ADR-0044): its page, an entry's, the votes and reports, and the ways in.
  'the leaderboard': [
    ...Object.values(BOARD_TEXT).filter((line) => !line.includes('{')),
    countsWords({ ups: 12, downs: 3 }),
  ],
  // The briefing in three parts (Phase 28): every heading and line, filled as the page fills
  // them.
  'the briefing': briefingTemplates().map((t) =>
    plainText(
      fillIn(t, {
        estimate: '£6.8bn',
        year: '2029-30',
        since: '2010',
        average: '£29bn',
        gilts: '£246bn',
      }),
    ),
  ),
};
