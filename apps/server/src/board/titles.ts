import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
} from 'obscenity';

/** The most characters a title may have. */
export const TITLE_MAX = 60;

/** Why a title was refused, as the player is told it. */
export type TitleProblem = 'empty' | 'long' | 'handle' | 'link' | 'swearing';

/**
 * Swearing and slurs: obscenity's English set, read through its transformers for disguised
 * spellings, with words it lacks that British players use, and place names it would otherwise
 * refuse.
 */
const SWEARING = new RegExpMatcher({
  ...new DataSet<{ originalWord: string }>()
    .addAll(englishDataset)
    .addPhrase((p) => p.setMetadata({ originalWord: 'bellend' }).addPattern(pattern`bellend`))
    .addPhrase((p) => p.setMetadata({ originalWord: 'tosser' }).addPattern(pattern`tosser`))
    .addPhrase((p) =>
      p
        .setMetadata({ originalWord: 'knobhead' })
        .addPattern(pattern`knobhead`)
        .addPattern(pattern`knobend`),
    )
    .addPhrase((p) => p.setMetadata({ originalWord: 'minge' }).addPattern(pattern`|minge|`))
    .addPhrase((p) => p.setMetadata({ originalWord: 'nonce' }).addPattern(pattern`|nonce|`))
    .addPhrase((p) =>
      p
        .setMetadata({ originalWord: 'paki' })
        .addPattern(pattern`|paki|`)
        .addPattern(pattern`|pakis|`),
    )
    .addPhrase((p) => p.addWhitelistedTerm('penistone').addWhitelistedTerm('shitterton'))
    .build(),
  ...englishRecommendedTransformers,
});

/** A web address, or the start of one: a scheme, "www." or a name before a common ending. */
const LINK =
  /\b(?:https?|ftp):|\bwww\.|[\p{L}\p{N}-]\.(?:com|co|uk|org|net|io|ly|me|app|dev|xyz|gg|tv|info|biz|ai|link|site|online|shop|ru|cn)\b/iu;

/** Letters spelled out one by one ("f u c k", "f.u.c.k"), written as the word they spell. */
function joinSpelledOut(text: string): string {
  return text.replace(
    /(?<![\p{L}\p{N}])(?:[\p{L}\p{N}][\s.\-_*]){2,}[\p{L}\p{N}](?![\p{L}\p{N}])/gu,
    (run) => run.replace(/[\s.\-_*]/g, ''),
  );
}

/**
 * A title as it is kept and shown: in Unicode's compatible form, so look-alike letters are the
 * letters they look like, without control or invisible formatting characters, and with its spaces
 * run together.
 */
export function normaliseTitle(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A player's title, as it will be shown, or why it cannot be. */
export function checkTitle(raw: unknown): { title: string } | { problem: TitleProblem } {
  const title = typeof raw === 'string' ? normaliseTitle(raw) : '';
  if (!title) return { problem: 'empty' };
  if ([...title].length > TITLE_MAX) return { problem: 'long' };
  if (title.includes('@')) return { problem: 'handle' };
  if (LINK.test(title)) return { problem: 'link' };
  if (SWEARING.hasMatch(title) || SWEARING.hasMatch(joinSpelledOut(title))) {
    return { problem: 'swearing' };
  }
  return { title };
}
