import {
  FINAL_STAGE,
  GAME_SETTINGS,
  SHARE_WORDS,
  encodePermalink,
  excludesPartners,
  fillStory,
  finetuneItems,
  gameImplementationYear,
  gameOutcomeOf,
  measureFigure,
  readFinishedBudget,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { takesOutWords } from '../components/LeverControl';
import { INVESTMENT_NOTE, RELIEF_NOTE } from '../components/LeverRow';
import {
  budget,
  electorate,
  finetune,
  finetuneName,
  gameData,
  guide,
  levers,
  ministers,
  pm,
  reception,
  scorecard,
} from '../data';
import { BOARD_TEXT, countsWords } from '../board/words';
import { BUDGET_TEXT } from '../pages/Budget';
import { SHARE_TEXT } from '../share/words';

const short = (l: { text: string; short?: string | undefined }) => l.short ?? l.text;
const curated = finetuneItems(finetune);

/**
 * Three finished Budgets from the data, summed up as a shared Budget is: one that changes nothing,
 * one that reverses the Budget's biggest tax rise, and one that puts a lot on everything, which
 * misses rules.
 */
const SHARED_BUDGETS = (() => {
  const outcomeOf = gameOutcomeOf(gameData);
  const budgets: Record<string, number>[] = [
    {},
    { b6hmrc: 1 },
    { dhsc: 5, dfe: 5, mod: 5, home: 10, cdel: 20, itbr: -2 },
  ];
  return budgets.map((leverValues) => {
    const query = encodePermalink(
      {
        vintageCode: gameData.vintage.permalinkCode,
        rulesCode: gameData.rules.permalinkCode,
        implementationYear: gameImplementationYear(gameData.vintage),
        leverValues,
        ...GAME_SETTINGS,
        game: { reached: FINAL_STAGE },
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
  'the ministers': ministers.ministers.flatMap((m) =>
    [m.asking, ...m.whenCut.map((b) => b.line), ...m.whenRaised.map((b) => b.line)].map(short),
  ),
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
  // The Budget the game starts from (ADR-0045): the page's own words, its story with the figures
  // filled as the page fills them, every measure in plain words with its figure, and why the ones a
  // reader might expect to move cannot be.
  'the Budget': [
    budget.title,
    BUDGET_TEXT.story,
    BUDGET_TEXT.measures,
    BUDGET_TEXT.measuresLead.replace('{year}', '2029-30'),
    ...Object.values(BUDGET_TEXT.groups),
    BUDGET_TEXT.change,
    BUDGET_TEXT.rest,
    BUDGET_TEXT.restLead,
    BUDGET_TEXT.start,
    BUDGET_TEXT.startLead,
    ...budget.measures.map((m) => measureFigure(scorecard, m, '2029-30')?.words ?? ''),
    ...budget.story.map((line) =>
      fillStory(line.text, {
        march: '£23.6bn',
        debtInterest: '£12.0bn',
        other: '£0.9bn',
        before: '£12.5bn',
        measures: '£2.0bn',
        headroom: '£14.5bn',
        year: '2029-30',
        welfareGap: '£2.8bn',
        tax: '£5.6bn',
        spending: '£0.4bn',
      }),
    ),
    ...budget.measures.flatMap((m) => [m.plain, ...(m.notMovable ? [m.notMovable.reason] : [])]),
  ],
};
