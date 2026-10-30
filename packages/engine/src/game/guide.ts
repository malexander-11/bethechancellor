import type { GuideFile, GuideStage, JourneyStep } from '../types/data.js';

/**
 * The guide: one entry per screen a player meets, in the order they meet them. The opening is the
 * Chancellor's Budget (ADR-0045), before the three steps. The two fine-tuning screens share one
 * entry: each has its own heading and line, from finetune.json.
 */
export const GUIDED_STEPS: readonly JourneyStep[] = ['start', 'finetune', 'review', 'budget-day'];

/** How many steps the kicker counts to: "Step 2 of 3" (ADR-0045). */
export const STEP_COUNT = 3;

/** A retired step's name (the briefing, the priorities, the flagships) finds the screen it led to. */
const ALIASES: Record<string, JourneyStep> = {
  outlook: 'finetune',
  assumptions: 'finetune',
  pm: 'finetune',
  deliver: 'finetune',
};

export function guideFor(guide: GuideFile, step: string): GuideStage | undefined {
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

/** Every glossary id a stage's line brackets, once each, in order. */
export function stageTerms(stage: GuideStage): string[] {
  const ids: string[] = [];
  for (const s of segments(stage.now)) {
    if (s.kind === 'term' && !ids.includes(s.id)) ids.push(s.id);
  }
  return ids;
}
