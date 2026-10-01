import {
  SHARE_WORDS,
  pictureRows,
  summaryWords,
  type BudgetSummary,
  type ChangeRow,
} from '@btc/engine';

/** The size every network previews a link at. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

type Style = Record<string, string | number>;

/** An element as satori reads it: React's shape, without React. */
export interface CardElement {
  type: 'div';
  props: { style: Style; children?: (CardElement | string)[] | string };
}

/** The site's own colours (apps/web/src/styles/tokens.css); a test holds them to the tokens. */
export const CARD_COLOURS = {
  page: '#f3eee2',
  surface: '#fbf8f1',
  ink: '#23262a',
  ink2: '#56554e',
  border: '#d9d0bc',
  brassInk: '#745a1f',
  accent: '#00644a',
  good: '#166a30',
  warning: '#7a4f00',
  critical: '#a3202a',
  box: '#a3202a',
  boxTop: '#bb3740',
  gilt: '#c9a85a',
} as const;

const C = CARD_COLOURS;
const SIDE_PADDING = 56;

/** A box that lays out what is in it; satori needs flex on any box with more than one child. */
function box(style: Style, ...children: (CardElement | string)[]): CardElement {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children } };
}

/** A run of words; satori clamps and cuts short only a block. */
function words(style: Style, text: string): CardElement {
  return { type: 'div', props: { style: { display: 'block', ...style }, children: text } };
}

/** The same colours as the meter on Budget day: red below three, amber at three, green above. */
function ratingColour(rating: number): string {
  return rating <= 2 ? C.critical : rating === 3 ? C.warning : C.good;
}

function meter(rating: number): CardElement {
  const lit = ratingColour(rating);
  return box(
    { gap: 4 },
    ...[1, 2, 3, 4, 5].map((step) =>
      box({ width: 18, height: 18, backgroundColor: step <= rating ? lit : C.border }),
    ),
  );
}

function changeRow(row: ChangeRow): CardElement {
  return box(
    { flexDirection: 'column', marginTop: 10 },
    words(
      {
        fontSize: 26,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      row.name,
    ),
    words(
      { fontSize: 24, lineHeight: 1.25, color: C.ink2 },
      [row.standing, row.words].filter(Boolean).join(' · '),
    ),
  );
}

function side(heading: string, rows: readonly ChangeRow[], none: string): CardElement {
  const { shown, more } = pictureRows(rows);
  return box(
    { flexDirection: 'column', flex: 1, minWidth: 0 },
    words(
      {
        fontSize: 26,
        fontWeight: 600,
        color: C.brassInk,
        paddingBottom: 6,
        borderBottom: `2px solid ${C.border}`,
      },
      heading,
    ),
    ...(rows.length === 0
      ? [words({ fontSize: 24, color: C.ink2, marginTop: 10 }, none)]
      : shown.map(changeRow)),
    ...(more > 0
      ? [
          words(
            { fontSize: 24, color: C.ink2, marginTop: 8 },
            SHARE_WORDS.more.replace('{n}', String(more)),
          ),
        ]
      : []),
  );
}

/** The band along the foot: the game's name, where the picture has room for it, and the invitation. */
function band(host: string, named: boolean): CardElement {
  return box(
    {
      height: 64,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${SIDE_PADDING}px`,
      backgroundColor: C.accent,
      color: C.surface,
      fontSize: 28,
      fontWeight: 600,
    },
    ...(named ? [words({}, SHARE_WORDS.game)] : []),
    words({}, SHARE_WORDS.invite.replace('{host}', host)),
  );
}

function page(...children: CardElement[]): CardElement {
  return box(
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      backgroundColor: C.page,
      color: C.ink,
      fontFamily: 'Source Serif 4',
    },
    ...children,
  );
}

/**
 * A finished Budget as a picture: its theme, its biggest tax and spending changes with what each
 * does, the headroom and the rules, and the three ratings, over the game's name and the invitation
 * to play. Only the changes give way when a long theme takes two lines: they are cut, never the
 * verdict or the invitation. Colour only marks the rules and the meters, always beside words.
 */
function budgetCard(summary: BudgetSummary, host: string): CardElement {
  const said = summaryWords(summary);
  const rulesColour = summary.rules.met
    ? C.good
    : summary.rules.welfareOnly
      ? C.warning
      : C.critical;
  const theme = box(
    { flexShrink: 0, padding: `30px ${SIDE_PADDING}px 0` },
    words(
      { fontFamily: 'Fraunces', fontWeight: 600, fontSize: 48, lineHeight: 1.1, lineClamp: 2 },
      said.title,
    ),
  );
  const changes = box(
    {
      gap: 48,
      marginTop: 16,
      padding: `0 ${SIDE_PADDING}px`,
      flexGrow: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    side(SHARE_WORDS.tax, summary.tax, SHARE_WORDS.noTax),
    side(SHARE_WORDS.spending, summary.spending, SHARE_WORDS.noSpending),
  );
  const ratings = box(
    { gap: 24, marginTop: 12 },
    ...summary.ratings.map((r) =>
      box(
        { flexDirection: 'column', flex: 1, gap: 4 },
        words({ fontSize: 24, fontWeight: 600 }, r.title),
        box(
          { alignItems: 'center', gap: 10 },
          meter(r.rating),
          words({ fontSize: 24, color: C.ink2 }, r.label),
        ),
      ),
    ),
  );
  const verdict = box(
    { flexDirection: 'column', flexShrink: 0, padding: `12px ${SIDE_PADDING}px 18px` },
    box(
      { fontSize: 24, flexWrap: 'wrap', columnGap: 8 },
      words({}, summary.headroomLine),
      words({ color: rulesColour, fontWeight: 600 }, said.rules),
    ),
    ratings,
  );
  return page(theme, changes, verdict, band(host, true));
}

/** The red Budget box, drawn plainly: its lid, its body and its gilt handle. */
function budgetBox(): CardElement {
  return box(
    { flexDirection: 'column', alignItems: 'center', width: 280 },
    box({ width: 70, height: 16, borderRadius: '8px 8px 0 0', backgroundColor: C.gilt }),
    box({ width: 280, height: 36, backgroundColor: C.boxTop }),
    box({ width: 280, height: 150, backgroundColor: C.box }),
  );
}

/** The picture of a link that is not a finished Budget: the game, and the invitation. */
function genericCard(host: string): CardElement {
  return page(
    box(
      {
        flexGrow: 1,
        alignItems: 'center',
        gap: 56,
        padding: `0 ${SIDE_PADDING}px`,
      },
      budgetBox(),
      box(
        { flexDirection: 'column', flex: 1 },
        words(
          { fontFamily: 'Fraunces', fontWeight: 600, fontSize: 72, lineHeight: 1.1 },
          SHARE_WORDS.game,
        ),
        words({ fontSize: 32, color: C.ink2, marginTop: 16, lineHeight: 1.3 }, SHARE_WORDS.pitch),
      ),
    ),
    band(host, false),
  );
}

/** The picture for a link: its finished Budget's, or the game's own when it has none. */
export function cardLayout(summary: BudgetSummary | null, host: string): CardElement {
  return summary ? budgetCard(summary, host) : genericCard(host);
}
