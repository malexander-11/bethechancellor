import type {
  GlossaryFile,
  GlossaryTerm,
  GuideFile,
  GuideStage,
  JourneyStep,
} from '../types/data.js';

/**
 * The guide: one entry per screen a player meets, in the order they meet them. The package's three
 * tabs and the two forecast screens are separate entries that share a step number.
 */
export const GUIDED_STEPS: readonly JourneyStep[] = [
  'start',
  'outlook',
  'pm',
  'taxes',
  'spending',
  'policies',
  'forecast',
  'compromise',
  'rabbit',
  'budget-day',
];

/** How many steps the kicker counts to: "Step 3 of 7". */
export const STEP_COUNT = 7;

const ALIASES: Partial<Record<JourneyStep, JourneyStep>> = {
  assumptions: 'outlook',
  recommendations: 'policies',
};

export function guideFor(guide: GuideFile, step: JourneyStep): GuideStage | undefined {
  const target = ALIASES[step] ?? step;
  return guide.stages.find((s) => s.step === target);
}

export type GuideSegment =
  { kind: 'text'; text: string } | { kind: 'term'; text: string; id: string };

/** `[headroom]`, or `[the OBR](obr)` when the words on the page are not the glossary id. */
const REF = /\[([^\]]+)\](?:\(([a-z0-9][a-z0-9-]*)\))?/g;

export function slugOfTerm(display: string): string {
  return display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Split guide text into plain runs and glossary references, in order. */
export function segments(text: string): GuideSegment[] {
  const out: GuideSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(REF)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    const display = m[1] ?? '';
    out.push({ kind: 'term', text: display, id: m[2] ?? slugOfTerm(display) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** The text with the brackets taken out: what a reader sees. */
export function plainText(text: string): string {
  return segments(text)
    .map((s) => s.text)
    .join('');
}

/** Every glossary id a stage refers to, bracketed in its text or listed, once each, in order. */
export function stageTerms(stage: GuideStage): string[] {
  const ids: string[] = [];
  for (const text of [stage.doing, stage.why, stage.now]) {
    for (const s of segments(text)) {
      if (s.kind === 'term' && !ids.includes(s.id)) ids.push(s.id);
    }
  }
  for (const id of stage.terms) if (!ids.includes(id)) ids.push(id);
  return ids;
}

/** The glossary entries a stage needs, resolved; an unknown id is dropped (the validator reports it). */
export function termsFor(
  glossary: GlossaryFile,
  stage: GuideStage,
): { id: string; term: GlossaryTerm }[] {
  return stageTerms(stage).flatMap((id) => {
    const term = glossary.terms[id];
    return term ? [{ id, term }] : [];
  });
}

/** Visible words in the three guide lines together: the budget is sixty. */
export function guideWords(stage: GuideStage): number {
  return [stage.doing, stage.why, stage.now]
    .map((t) => plainText(t).trim().split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
}
