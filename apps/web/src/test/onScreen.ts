import {
  FINAL_STAGE,
  GAME_SETTINGS,
  SHARE_WORDS,
  encodePermalink,
  fillStory,
  gameImplementationYear,
  gameOutcomeOf,
  readFinishedBudget,
  restMeasures,
  summariseBudget,
  summaryWords,
} from '@btc/engine';
import { INVESTMENT_WORDS, moneyWords } from '../components/MeasureCard';
import { balance, budget, electorate, gameData, guide, ministers, pm, reception } from '../data';
import { agreeWords, BOARD_TEXT, countsWords } from '../board/words';
import { balanceWords } from '../journey/balance';
import { BALANCE_TEXT } from '../pages/Balance';
import { LANDING_TEXT } from '../pages/Landing';
import { CARD_TEXT } from '../components/MeasureCard';
import { MEASURES_TEXT } from '../pages/Measures';
import { SHARE_TEXT } from '../share/words';

const short = (l: { text: string; short?: string | undefined }) => l.short ?? l.text;

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
  // The landing page (ADR-0048): the Budget's name, the page's own words as it fills them, and
  // the story in its fold with the figures filled as the page fills them.
  'the Budget': [
    budget.title,
    ...Object.values(LANDING_TEXT).map((line) =>
      line.replace('{name}', 'John Healey').replace('{year}', '2029-30'),
    ),
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
  ],
  // The walk through the measures (ADR-0046, ADR-0047): each theme's title and lead, each card's
  // heading and what it means, what disagreeing does to the money, the public's answers, and the
  // walk's own words.
  'the measures': [
    ...budget.themes.flatMap((t) => [
      t.title,
      t.lead,
      ...t.cards.flatMap((c) => [c.title, c.explain]),
    ]),
    moneyWords(-500, '2029-30'),
    moneyWords(500, '2029-30'),
    moneyWords(0, '2029-30'),
    INVESTMENT_WORDS,
    BOARD_TEXT.agree,
    BOARD_TEXT.disagree,
    CARD_TEXT.approve,
    CARD_TEXT.remove,
    CARD_TEXT.more,
    CARD_TEXT.source.replace('{budget}', budget.title).replace('{lines}', 'lines 3 and 4'),
    BOARD_TEXT.votingLead,
    BOARD_TEXT.votingClosed,
    BOARD_TEXT.votingDown,
    agreeWords({ ups: 12, downs: 3 }),
    ...Object.values(MEASURES_TEXT).map((line) => line.replace('{title}', 'businesses')),
    `Your money, 2029-30: ${balanceWords(-500)}`,
    balanceWords(1200),
    balanceWords(0),
  ],
  // The small print (ADR-0046): every measure no card asks about, in plain words, and why the
  // ones a reader might expect to move cannot be.
  // The walk's last page (ADR-0049): each group's heading, and each of its measures in its own words.
  'the small print': budget.rest.flatMap((row) => [
    row.title,
    ...restMeasures(budget, row).map((m) => m.plain),
  ]),
  // The balance page (ADR-0046): what each option is and what one press does, and the page's own
  // words with their figures filled.
  'the menus': [
    ...[...balance.raise, ...balance.spend].flatMap((o) => [o.label, o.each]),
    ...Object.values(BALANCE_TEXT).map((line) => line.replace('{money}', '£1.2bn')),
    'Added once',
    'Added twice',
    'Added 3 times',
    'Strains the tax lock',
  ],
};
