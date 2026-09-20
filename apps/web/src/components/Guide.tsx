import { STEP_COUNT, segments, termsFor, type Badge, type JourneyStep } from '@btc/engine';
import { Fragment } from 'react';
import { glossary, guideFor } from '../data';
import { usePageTitle } from '../journey/title';
import { BADGE_LABELS, LabelBadge } from './LabelBadge';
import { SourceList } from './SourceLink';
import { Term } from './Term';

const BADGES = Object.keys(BADGE_LABELS) as Badge[];

function Marked({ text }: { text: string }) {
  return (
    <>
      {segments(text).map((s, i) =>
        s.kind === 'text' ? (
          <Fragment key={i}>{s.text}</Fragment>
        ) : (
          <Term key={i} id={s.id}>
            {s.text}
          </Term>
        ),
      )}
    </>
  );
}

/**
 * The guide strip at the top of every step: which step this is, what you are doing, why it
 * matters and what to do now, written for someone clever who does not follow politics. It is
 * chrome, like the dateline: no badge, and no figure that is not sourced (guide.test.ts). A step
 * with more than one screen says which one this is ("Part 2 of 2: the spending").
 */
export interface GuidePart {
  /** "Part", on every step that has more than one screen. */
  noun: string;
  index: number;
  total: number;
  label: string;
}

export function Guide({ step, part }: { step: JourneyStep; part?: GuidePart }) {
  const stage = guideFor(step);
  usePageTitle(
    stage
      ? `${stage.title.replace(/\.$/, '')}${part ? ` (${part.label})` : ''} · Step ${stage.number} of ${STEP_COUNT}`
      : undefined,
  );
  if (!stage) return null;
  const terms = termsFor(glossary, stage);
  return (
    <header className="guide doc">
      <p className="kicker guide__kicker">
        <span>
          Step {stage.number} of {STEP_COUNT}
        </span>
        {part ? (
          <span className="guide__part">
            {part.noun} {part.index} of {part.total}: {part.label}
          </span>
        ) : null}
      </p>
      <h1 className="page-title">{stage.title}</h1>
      <dl className="guide__lines">
        <div className="guide__line">
          <dt>What you’re doing</dt>
          <dd>
            <Marked text={stage.doing} />
          </dd>
        </div>
        <div className="guide__line">
          <dt>Why it matters</dt>
          <dd>
            <Marked text={stage.why} />
          </dd>
        </div>
        <div className="guide__line guide__line--now">
          <dt>Do now</dt>
          <dd>
            <Marked text={stage.now} />
          </dd>
        </div>
      </dl>
      {terms.length > 0 ? (
        <details className="guide__terms">
          <summary>Words on this page</summary>
          <dl>
            {terms.map(({ id, term }) => (
              <div key={id}>
                <dt>{term.term}</dt>
                <dd>
                  {term.short}
                  <SourceList as="span" className="briefing__sources" refs={term.sources} />
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      <details className="guide__terms">
        <summary>What the badges mean</summary>
        <dl>
          {BADGES.map((badge) => (
            <div key={badge}>
              <dt>
                <LabelBadge badge={badge} />
              </dt>
              <dd>{BADGE_LABELS[badge].title}</dd>
            </div>
          ))}
        </dl>
      </details>
    </header>
  );
}
